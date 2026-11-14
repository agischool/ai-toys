"""回归检查的是规则与证据处理，不是语言模型能力。"""

import json
from copy import deepcopy
from pathlib import Path
import tempfile
import unittest

import lab


class ToolEvidenceTests(unittest.TestCase):
    def test_unknown_tool_does_not_execute(self):
        result = lab.execute({"request_id": "T0", "tool": "book_venue", "args": {}}, {}, {})
        self.assertEqual(result["status"], "unknown_tool")
        self.assertFalse(result["executed"])

    def test_boolean_is_not_accepted_as_hour_integer(self):
        called = []
        result = lab.execute({"request_id": "T2", "tool": "time", "args": {"hour": True}},
                             {"time": lambda hour: called.append(hour)}, {"time": {"hour": int}})
        self.assertEqual(result["status"], "invalid_args")
        self.assertEqual(called, [])

    def test_invalid_arguments_do_not_execute_tool(self):
        called = []
        result = lab.execute({"request_id": "T1", "tool": "read", "args": {"wrong": 1}},
                             {"read": lambda name: called.append(name)}, {"read": {"name": str}})
        self.assertEqual(result["status"], "invalid_args")
        self.assertFalse(result["executed"])
        self.assertEqual(called, [])

    def test_empty_result_is_not_a_tool_failure(self):
        cases = {case["case"]: case for case in lab.episode17()["cases"]}
        self.assertEqual(cases["no_match"]["event"]["status"], "ok")
        self.assertEqual(cases["no_match"]["event"]["result"], [])
        self.assertEqual(cases["tool_error"]["event"]["status"], "tool_error")
        self.assertNotEqual(cases["no_match"]["answer"], cases["tool_error"]["answer"])

    def test_existing_output_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "output"
            lab.save_output({"original": 1}, target)
            with self.assertRaises(FileExistsError):
                lab.save_output({"original": 2}, target)
            self.assertEqual(json.loads((target / "result.json").read_text()), {"original": 1})


class WorkflowTests(unittest.TestCase):
    def test_success_requires_time_and_detail_calls(self):
        run = lab.venue_workflow(lab.environment(), lab.TASK)
        self.assertEqual(run["tool_calls"], 2)
        self.assertEqual([e["tool"] for e in run["trace"]], ["search_venues", "read_details"])
        self.assertEqual(run["suggestion"]["venue_id"], "V1")

    def test_duplicate_request_is_blocked_before_execution(self):
        run = lab.venue_workflow(lab.environment(), lab.TASK, repeat_search=True)
        self.assertEqual(run["tool_calls"], 1)
        self.assertEqual(run["status"], "blocked_repeat")
        self.assertFalse(run["trace"][-1]["executed"])
        self.assertIsNone(run["suggestion"])

    def test_step_limit_does_not_claim_success(self):
        run = lab.venue_workflow(lab.environment(), lab.TASK, max_steps=1)
        self.assertEqual(run["status"], "blocked_step_limit")
        self.assertEqual(run["tool_calls"], 1)
        self.assertIsNone(run["suggestion"])

    def test_missing_equipment_does_not_mean_no_equipment(self):
        env = lab.environment()
        env["details"]["V1"]["equipment"] = None
        self.assertEqual(lab.venue_workflow(env, lab.TASK)["status"], "insufficient_evidence")
        env["details"]["V1"]["equipment"] = []
        self.assertEqual(lab.venue_workflow(env, lab.TASK)["status"], "no_qualified_venue")

    def test_workflow_does_not_mutate_task_or_fixtures(self):
        env, task = lab.environment(), deepcopy(lab.TASK)
        before = deepcopy((env, task))
        lab.venue_workflow(env, task)
        self.assertEqual((env, task), before)


class VerificationTests(unittest.TestCase):
    def test_declared_success_cannot_hide_ramp_failure(self):
        fault = lab.episode20()["fault_demo"]
        self.assertEqual(fault["run"]["status"], "suggested")
        self.assertEqual(fault["verification"]["outcome"], "incorrect_completion")
        self.assertFalse(fault["verification"]["checks"]["ramp"])
        self.assertTrue(fault["verification"]["checks"]["equipment"])

    def test_missing_tool_evidence_rejects_even_correct_venue(self):
        env = lab.environment()
        run = lab.venue_workflow(env, lab.TASK)
        run["trace"] = []
        verdict = lab.verify_run(run, env, lab.TASK, "suggested")
        self.assertEqual(verdict["outcome"], "incorrect_completion")
        self.assertFalse(verdict["checks"]["hours_evidence"])
        self.assertFalse(verdict["checks"]["details_evidence"])

    def test_each_required_condition_is_checked_independently(self):
        for field, value in [("period", "明年"), ("day", "周一"), ("end", 18),
                             ("equipment", "显微镜"), ("ramp", True)]:
            with self.subTest(field=field):
                env = lab.environment()
                run = lab.venue_workflow(env, lab.TASK)
                task = {**lab.TASK, field: value}
                if field == "ramp":
                    env["details"]["V1"]["ramp"] = False
                verdict = lab.verify_run(run, env, task, "suggested")
                self.assertFalse(verdict["task_completed"])

    def test_unnecessary_stop_is_not_appropriate(self):
        env = lab.environment()
        run = lab.venue_workflow(env, lab.TASK, max_steps=0)
        self.assertEqual(lab.verify_run(run, env, lab.TASK, "suggested")["outcome"], "incorrect_result")

    def test_expected_label_does_not_replace_success_checks(self):
        env = lab.environment()
        run = lab.venue_workflow(env, lab.TASK)
        self.assertEqual(lab.verify_run(run, env, lab.TASK, "tool_error")["outcome"], "task_success")

    def test_context_presence_does_not_confuse_fact_with_requirement(self):
        comparisons = {c["mode"]: c for c in lab.episode19()["comparisons"]}
        truncated = comparisons["last_three"]
        self.assertIn("有坡道", truncated["input_text"])
        self.assertFalse(truncated["requirements_present"]["ramp_required"])
        self.assertFalse(comparisons["manual_summary_missing_ramp"]["requirements_present"]["ramp_required"])
        self.assertTrue(all(comparisons["retrieve_requirements"]["requirements_present"].values()))

    def test_case_counts_and_ids(self):
        groups = lab.episode20()["groups"]
        ids = []
        for group in groups.values():
            self.assertEqual(group["sample_count"], 6)
            self.assertEqual(group["counts"]["task_success"], 1)
            self.assertEqual(group["counts"]["appropriate_stop"], 5)
            ids += [case["case_id"] for case in group["cases"]]
        self.assertEqual(len(set(ids)), 12)

    def test_all_saved_reference_outputs_are_reproducible(self):
        root = Path(__file__).parent / "outputs" / "reference"
        for episode in (17, 18, 19, 20):
            with self.subTest(episode=episode):
                saved = json.loads((root / f"episode{episode}" / "result.json").read_text(encoding="utf-8"))
                self.assertEqual(saved, getattr(lab, f"episode{episode}")())


if __name__ == "__main__":
    unittest.main()
