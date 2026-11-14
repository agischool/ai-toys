#!/usr/bin/env python3
"""17—20 期标准库规则演示；不包含真实模型调用。"""

from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path

from fixtures import ANNOUNCEMENTS, DETAILS, TASK, VENUES

NOTICE = "构造资料与规则程序的本地执行；没有调用真实模型，不代表模型能力测评。"


def execute(request: dict, functions: dict, schemas: dict) -> dict:
    """校验失败时不调用函数；空查询结果仍为正常执行。"""
    result = {"request_id": request["request_id"], "tool": request["tool"],
              "args": deepcopy(request["args"]), "executed": False}
    name, args = request["tool"], request["args"]
    if name not in functions:
        return {**result, "status": "unknown_tool", "result": "工具不存在"}
    schema = schemas[name]
    if (not isinstance(args, dict) or set(args) != set(schema)
            or any(type(args[key]) is not kind for key, kind in schema.items())):
        return {**result, "status": "invalid_args", "result": "参数名称或类型不符合约定"}
    result["executed"] = True
    try:
        content = functions[name](**args)
    except Exception as error:
        return {**result, "status": "tool_error", "result": str(error)}
    return {**result, "status": "ok", "result": deepcopy(content)}


def search_announcements(facility: str, period: str) -> list:
    return [deepcopy(doc) for doc in ANNOUNCEMENTS
            if doc["facility"] == facility and doc["period"] == period]


def episode17() -> dict:
    cases = []
    schema = {"search_announcements": {"facility": str, "period": str}}
    specs = [
        ("success", {"facility": "图书馆", "period": "本学期"}),
        ("no_match", {"facility": "图书馆", "period": "明年"}),
        ("invalid_args", {"period": "本学期"}),
        ("tool_error", {"facility": "图书馆", "period": "本学期"}),
    ]
    for number, (name, args) in enumerate(specs, 1):
        def unavailable(**_):
            raise OSError("演示故障：公告资料读取失败")
        function = unavailable if name == "tool_error" else search_announcements
        event = execute({"request_id": f"Q{number}", "tool": "search_announcements",
                         "args": args}, {"search_announcements": function}, schema)
        if event["status"] == "ok":
            answer = ("按D1的本学期常规安排，周二15点开放；不保证临时检修状态。"
                      if event["result"] else "已完成查找，但现有资料没有明年的安排。")
        else:
            answer = ("请求参数无效，未执行查询。" if not event["executed"]
                      else "查询未完成，不能据此确认有没有公告。")
        cases.append({"case": name, "event": event, "answer": answer})
    return {"episode": 17, "notice": NOTICE, "cases": cases}


def environment() -> dict:
    return {"venues": deepcopy(VENUES), "details": deepcopy(DETAILS), "fail_tools": []}


def venue_workflow(env: dict, task: dict, *, max_steps: int = 4,
                   repeat_search: bool = False) -> dict:
    """固定顺序查时间、查详情、比较条件；没有模型选择动作。"""
    trace, seen, checks = [], set(), []

    def search_venues(period, day, start, end):
        return [deepcopy(venue) for venue in env["venues"]
                if venue["period"] == period and venue["day"] == day
                and venue["start"] <= start and end <= venue["end"]]

    def read_details(venue_id):
        return deepcopy(env["details"].get(venue_id))

    def invoke(name, args):
        request = {"request_id": f"Q{len(trace) + 1}", "tool": name, "args": args}
        signature = json.dumps([name, args], sort_keys=True, ensure_ascii=False)
        if signature in seen:
            event = {**request, "status": "blocked_repeat", "executed": False,
                     "result": "相同请求已执行，停止重复查询"}
        elif sum(event["executed"] for event in trace) >= max_steps:
            event = {**request, "status": "blocked_step_limit", "executed": False,
                     "result": "已达到本例工具执行步数限制"}
        else:
            seen.add(signature)
            def unavailable(**_):
                raise OSError(f"演示故障：{name}读取失败")
            funcs = {"search_venues": search_venues, "read_details": read_details}
            if name in env["fail_tools"]:
                funcs[name] = unavailable
            event = execute(request, funcs, {
                "search_venues": {"period": str, "day": str, "start": int, "end": int},
                "read_details": {"venue_id": str},
            })
        trace.append(event)
        return event

    def finish(status, suggestion=None):
        return {"status": status, "task": deepcopy(task), "suggestion": suggestion,
                "action_scope": "仅建议；没有预约工具，也不执行预约",
                "trace": trace, "candidate_checks": checks,
                "tool_calls": sum(event["executed"] for event in trace),
                "max_steps": max_steps}

    search_args = {key: task[key] for key in ("period", "day", "start", "end")}
    response = invoke("search_venues", search_args)
    if response["status"] != "ok":
        return finish(response["status"])
    if repeat_search:
        response = invoke("search_venues", search_args)
        return finish(response["status"])
    if not response["result"]:
        return finish("no_match")
    for candidate in response["result"]:
        response = invoke("read_details", {"venue_id": candidate["venue_id"]})
        if response["status"] != "ok":
            return finish(response["status"])
        detail = response["result"]
        if detail is None or detail.get("equipment") is None or detail.get("ramp") is None:
            return finish("insufficient_evidence")
        if detail["conflict"]:
            return finish("conflicting_evidence")
        eligible = task["equipment"] in detail["equipment"] and (not task["ramp"] or detail["ramp"])
        checks.append({"venue_id": candidate["venue_id"], "eligible": eligible,
                       "equipment_satisfied": task["equipment"] in detail["equipment"],
                       "ramp_satisfied": not task["ramp"] or detail["ramp"]})
        if eligible:
            return finish("suggested", {"venue_id": candidate["venue_id"], "name": candidate["name"],
                          "hours_source": candidate["hours_source"], "details_source": detail["source"]})
    return finish("no_qualified_venue")


def episode18() -> dict:
    missing = environment()
    missing["details"]["V1"]["equipment"] = None
    cases = [
        ("success", venue_workflow(environment(), TASK)),
        ("missing_equipment", venue_workflow(missing, TASK)),
        ("repeated_call", venue_workflow(environment(), TASK, repeat_search=True)),
        ("step_limit", venue_workflow(environment(), TASK, max_steps=1)),
    ]
    return {"episode": 18, "notice": NOTICE, "cases": [{"case": name, **run} for name, run in cases]}


def episode19() -> dict:
    cards = [
        {"id": "C1", "kind": "requirement", "text": "场地必须有坡道"},
        {"id": "C2", "kind": "requirement", "text": "本学期周二15—16"},
        {"id": "C3", "kind": "requirement", "text": "需要投影仪"},
        {"id": "C4", "kind": "observation", "text": "V1科学活动室：周二15—17，有投影仪，有坡道"},
        {"id": "C5", "kind": "observation", "text": "V2阅览活动室：周二15—17，有投影仪，无坡道"},
        {"id": "C6", "kind": "requirement", "text": "只给建议，不预约"},
    ]
    good = "场地必须有坡道；本学期周二15—16；需要投影仪；只给建议，不预约。V1有投影仪和坡道，V2无坡道。"
    bad = "本学期周二15—16；需要投影仪；只给建议，不预约。V1、V2都有投影仪。"
    requirements = [card for card in cards if card["kind"] == "requirement"]
    observations = [card for card in cards if card["kind"] == "observation"]
    modes = [
        ("full", cards, "原始六卡"),
        ("last_three", cards[-3:], "固定截断规则，只留最后三张卡"),
        ("manual_summary_good", [{"id": "H1", "text": good}], "人工编写的完整对照摘要"),
        ("manual_summary_missing_ramp", [{"id": "H2", "text": bad}], "人工刻意漏掉坡道要求的对照摘要"),
        ("retrieve_requirements", requirements + observations, "按kind字段检索条件记录，再附场地结果"),
    ]
    results = []
    for name, selected, origin in modes:
        text = "\n".join(card["text"] for card in selected)
        results.append({"mode": name, "origin": origin, "input_cards": selected,
                        "input_text": text, "characters": len(text),
                        "requirements_present": {
                            "ramp_required": "必须有坡道" in text,
                            "time_and_period": "本学期周二15—16" in text,
                            "projector_required": "需要投影仪" in text,
                            "no_booking": "只给建议，不预约" in text}})
    return {"episode": 19, "notice": NOTICE, "original_cards": cards, "comparisons": results,
            "check_scope": "固定教学文本的关键短语保留检查；字符不是token，保留不等于模型会正确使用。"}


def evaluation_cases() -> dict:
    """期望结果由案例表声明；验收不使用它替代条件检查。"""
    development, reserved = [], []

    def add(group, case_id, description, expected, env=None, task=None):
        group.append({"case_id": case_id, "description": description,
                      "expected_status": expected, "environment": env or environment(),
                      "task": task or deepcopy(TASK)})

    add(development, "D01", "资料完整，V1满足全部条件", "suggested")
    env = environment(); env["details"]["V1"]["equipment"] = None
    add(development, "D02", "V1设备表缺失", "insufficient_evidence", env)
    env = environment(); env["details"]["V1"]["ramp"] = False
    add(development, "D03", "两个场地均无坡道", "no_qualified_venue", env)
    task = {**TASK, "period": "明年"}
    add(development, "D04", "查询明年，只有本学期资料", "no_match", task=task)
    env = environment(); env["details"]["V1"]["conflict"] = True
    add(development, "D05", "V1详情有冲突标记，未解决", "conflicting_evidence", env)
    env = environment(); env["fail_tools"] = ["read_details"]
    add(development, "D06", "详情工具读取失败", "tool_error", env)

    env = environment(); env["venues"][0]["end"] = 15
    add(reserved, "H01", "V1时段不覆盖任务，V2无坡道", "no_qualified_venue", env)
    env = environment(); env["details"]["V1"]["equipment"] = []; env["details"]["V2"]["ramp"] = True
    add(reserved, "H02", "V1无投影仪，V2补齐坡道可选", "suggested", env)
    env = environment(); env["details"]["V1"]["ramp"] = None
    add(reserved, "H03", "V1坡道状态未知", "insufficient_evidence", env)
    add(reserved, "H04", "查周一，资料只覆盖周二", "no_match", task={**TASK, "day": "周一"})
    env = environment(); env["fail_tools"] = ["search_venues"]
    add(reserved, "H05", "候选场地查询工具失败", "tool_error", env)
    env = environment(); env["venues"][0]["period"] = "上学期"
    add(reserved, "H06", "V1时间资料过期，V2无坡道", "no_qualified_venue", env)
    return {"development": development, "reserved": reserved}


def verify_run(run: dict, env: dict, task: dict, expected_status: str) -> dict:
    """独立读资料、任务和轨迹；不得仅凭工作流宣称suggested判成功。"""
    suggestion = run["suggestion"]
    if suggestion is None:
        # 明确区分恰当停止与不该停止：期望标签只用于停止原因的验收。
        appropriate = expected_status != "suggested" and run["status"] == expected_status
        return {"outcome": "appropriate_stop" if appropriate else "incorrect_result",
                "task_completed": False, "checks": {"stop_reason_matches_case": appropriate}}
    venue = next((v for v in env["venues"] if v["venue_id"] == suggestion["venue_id"]), None)
    details = env["details"].get(suggestion["venue_id"])
    checks = {
        "task_unchanged": run["task"] == task,
        "known_venue": venue is not None,
        "period": venue is not None and venue["period"] == task["period"],
        "day": venue is not None and venue["day"] == task["day"],
        "time": venue is not None and venue["start"] <= task["start"] < task["end"] <= venue["end"],
        "equipment": details is not None and details.get("equipment") is not None
                     and task["equipment"] in details["equipment"],
        "ramp": details is not None and (not task["ramp"] or details.get("ramp") is True),
        "unconflicted": details is not None and details.get("conflict") is False,
        "hours_evidence": False, "details_evidence": False,
        "only_advice": all(e["tool"] in {"search_venues", "read_details"} for e in run["trace"]),
    }
    for event in run["trace"]:
        if not event["executed"] or event["status"] != "ok":
            continue
        if event["tool"] == "search_venues" and venue is not None:
            checks["hours_evidence"] |= (venue in event["result"]
                                          and suggestion["hours_source"] == venue["hours_source"])
        if event["tool"] == "read_details" and details is not None:
            checks["details_evidence"] |= (event["args"]["venue_id"] == suggestion["venue_id"]
                                            and event["result"] == details
                                            and suggestion["details_source"] == details["source"])
    passed = all(checks.values())
    return {"outcome": "task_success" if passed else "incorrect_completion",
            "task_completed": passed, "checks": checks}


def episode20() -> dict:
    groups = {}
    for name, cases in evaluation_cases().items():
        rows = []
        for case in cases:
            run = venue_workflow(case["environment"], case["task"])
            verdict = verify_run(run, case["environment"], case["task"], case["expected_status"])
            rows.append({**case, "run": run, "verification": verdict})
        groups[name] = {"sample_count": len(rows), "cases": rows,
                        "counts": {outcome: sum(r["verification"]["outcome"] == outcome for r in rows)
                                   for outcome in ("task_success", "appropriate_stop", "incorrect_completion", "incorrect_result")}}
    # 刻意做错的另一个演示：比较条件时遗漏坡道；不是实际模型犯错记录。
    env = environment()
    env["venues"].reverse()  # 让无坡道的V2先成为候选
    faulty = venue_workflow(env, {**TASK, "ramp": False})
    faulty["task"] = deepcopy(TASK)  # 展示的原始用户任务仍要求坡道
    faulty["injected_fault"] = "固定规则演示故意在比较条件时忽略ramp=true；并非真实模型输出。"
    return {"episode": 20, "notice": NOTICE,
            "evaluation_scope": "公开的6个开发案例和6个保留对照案例，现已共同用于代码回归；没有盲测或模型调用，不是独立模型测评。",
            "groups": groups,
            "fault_demo": {"run": faulty, "verification": verify_run(faulty, env, TASK, "suggested"),
                           "first_deviation": "比较候选条件时把必须有坡道这一要求忽略了"}}


def save_output(payload: dict, destination: Path) -> Path:
    """独占新目录，现有目录（包括空目录）也不覆盖。"""
    destination.mkdir(parents=True, exist_ok=False)
    path = destination / "result.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--episode", type=int, choices=[17, 18, 19, 20], required=True)
    parser.add_argument("--output", type=Path, help="必须是尚不存在的输出目录")
    args = parser.parse_args()
    payload = {17: episode17, 18: episode18, 19: episode19, 20: episode20}[args.episode]()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = args.output or Path(__file__).parent / "outputs" / "runs" / f"ep{args.episode}-{stamp}"
    try:
        result = save_output(payload, destination)
    except FileExistsError:
        parser.error(f"输出目录已存在，未写入：{destination}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"\n输出：{result}")


if __name__ == "__main__":
    main()
