# T2–T10 independent scientific review

Reviewed against the actual Python implementation in `source/series_python/toys/` and the preserved seed-42 run report, not against mechanism names alone.

## Scope and findings

- T2: threshold-only decisions, logistic probabilities, training-only gradients, and separately generated browser test data are correctly distinguished. Browser RNG/data differ from Python and are labeled.
- T3: true 2→4→1 tanh/linear forward and backward, 17 parameters, paired initial parameters, and training-only four-point XOR experiment are correctly explained. No browser generalization score is claimed.
- T4: valid cross-correlation (no kernel reversal), shared kernels, tanh and average pooling are correct. Single hand-set browser filter is distinguished from the trained six-filter Python CNN. Boundary and noise failure caveats match the original experiment.
- T5: scalar forward and chain-rule sensitivities are correct, including cancellation and amplification. The text distinguishes output sensitivity from Python loss-gradient norms and states the deliberately identity-like target and limited three-seed comparison.
- T6: scalar recurrent state and first-input sensitivity match the source mechanism. Fixed browser recurrence is distinguished from the trained 16-unit RNN. Delayed recall and next-character objectives, and validation versus independent test, are not conflated.
- T7: scaled dot-product scores, per-row stable softmax, causal masking, value mixing, and operator-only scope are correct. Attention heatmaps are not presented as causal explanations or understanding scores.
- T8: fixed, untrained D4/FF6 browser decoder preserves the pre-LN single-head block structure. Hand-computed vectors agree with the engine at six decimal places. The D16/FF32 trained copying experiment, teacher-forced copy accuracy, free-generation exact match, and limited alphabet/length are distinguished. No ChatGPT equivalence is claimed.
- T9: read, cosine-address, and erase/add operations match source; controller is explicitly fixed and untrained. Wrong-address writes, post-write reads, soft mixing, and lack of RAG are correctly explained.
- T10: actual MDL1 serialized bytes are counted and independently decoded. Literal plus one modal candidate for each period up to 16 is accurately described as a restricted heuristic family. Header overhead, Unicode code points versus bytes, surrogate limitations, resource caps, and lack of checksum are disclosed. No universal intelligence or optimal-compression claim is made.

## Reproducible independent checks

Run `python tests/science-review.py` from a Python environment with the bundled requirements installed and Node available.

- T3: 34 analytic gradient coordinates checked by centered finite differences, including nonlinear and linear modes; maximum absolute error 1.044e-11.
- T5: 20 scalar sensitivity configurations cover linear/tanh branches, residual/plain modes, and coefficients -1.5, -1, 0, 0.5, 1.5.
- T6: 12 long-delay sensitivity configurations checked numerically.
- T8: exact causal-prefix isolation and zero forbidden attention weights.
- T10: 103 independently constructed strings, 1,709 candidate byte streams; every candidate is byte-for-byte identical to Python, with exact round-trip. Corpus includes emoji, Chinese, newline, NUL and BOM.

Two small editorial corrections were applied and rechecked: T6 second-step derivative rounds to 0.182256; T8 epsilon belongs inside the square root with the variance. Final reviewed chapter files have no outstanding scientific blockers.

This report covers scientific content and numerical mechanisms. It is not a claim of a completed visual-browser or public-deployment audit.
