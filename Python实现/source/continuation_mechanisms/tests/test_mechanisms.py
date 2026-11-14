"""数值性质、负对照与历史结果保护。"""
from pathlib import Path
import hashlib
import subprocess
import sys
import tempfile
import unittest
import numpy as np

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from mechanisms import masked_loss_check, cache_check, moe_check


class MechanismTests(unittest.TestCase):
    def test_answer_loss_updates_parameters_without_prompt_logit_gradient(self):
        r = masked_loss_check()
        self.assertEqual(r["selected_target_positions"], [5, 6, 7, 8, 9])
        self.assertEqual(r["masked_logit_gradient_max"], 0)
        self.assertGreater(r["parameter_delta_l2"], 0)
        self.assertLess(r["one_step_loss_after"], r["one_step_loss_before"])

    def test_incremental_cache_equivalence_and_position_negative_control(self):
        r = cache_check()
        self.assertLess(r["float64_max_logit_error"], 1e-10)
        self.assertGreater(r["wrong_position_negative_control_error"], 1e-8)
        n = r["prefixes_per_model"]
        self.assertEqual(r["full_prefix_kv_token_projections"], n * (n + 1) // 2)
        self.assertEqual(r["incremental_kv_token_projections"], n)
        self.assertEqual(r["final_kv_cache_bytes_per_model"], 2 * n * 16 * 8)

    def test_sparse_outputs_reconstruct_from_selected_paths(self):
        r = moe_check()
        probs = np.array(r["router_probabilities"])
        selected = np.array(r["selected_expert_ids_zero_based"])
        weights = probs[selected] / probs[selected].sum()
        np.testing.assert_allclose(weights, r["renormalized_weights"])
        outputs = np.array(r["selected_expert_outputs"])
        np.testing.assert_allclose(weights @ outputs, [2.4, 4.8])
        self.assertEqual(r["expert_parameters_stored"], 16)
        self.assertEqual(r["expert_parameters_used_for_this_token"], 8)

    def test_existing_output_is_rejected_without_overwrite(self):
        with tempfile.TemporaryDirectory() as parent:
            output = Path(parent) / "result"
            command = [sys.executable, str(HERE / "run_all.py"), "--output", str(output)]
            first = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            target = output / "result.json"
            original = hashlib.sha256(target.read_bytes()).hexdigest()
            second = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(second.returncode, 0)
            self.assertIn("输出目录已存在", second.stderr)
            self.assertEqual(hashlib.sha256(target.read_bytes()).hexdigest(), original)


if __name__ == "__main__":
    unittest.main()
