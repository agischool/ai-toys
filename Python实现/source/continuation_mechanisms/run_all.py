#!/usr/bin/env python3
"""生成续篇21—23机制实验结果，输出目录必须不存在。"""
from pathlib import Path
import argparse
import hashlib
import json
import platform


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    # Reserve the output before importing dependencies or computing anything.
    try:
        args.output.mkdir(parents=True, exist_ok=False)
    except FileExistsError:
        parser.error(f"输出目录已存在，未写入：{args.output}")
    try:
        import numpy as np
        from mechanisms import masked_loss_check, cache_check, moe_check, ROOT
        sources = ["Python实现/source/series_python/toys/t08_transformer.py",
                   "Python实现/source/series_python/toys/t07_attention.py",
                   "Python实现/source/series_python/toys/common.py"]
        payload = {
            "notice": "原创构造机制实验；没有付费API或模型服务调用，不是通用能力评估。",
            "sft_loss_mask": masked_loss_check(),
            "kv_cache": cache_check(),
            "moe": moe_check(),
            "environment": {"python": platform.python_version(), "numpy": np.__version__,
                            "dtype": "float64"},
            "source_sha256": {s: hashlib.sha256((ROOT / s).read_bytes()).hexdigest() for s in sources},
        }
        result = args.output / "result.json"
        result.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(result)
    except Exception:
        # Keep the newly reserved directory as evidence of an incomplete run.
        # A rerun must name another output directory.
        raise


if __name__ == "__main__":
    main()
