from pathlib import Path
from zipfile import ZipFile
import re, json, sys

ROOT = Path(__file__).resolve().parent.parent
BACKUP = ROOT / '_原稿备份/2026-10-05_修订前.zip'
TITLES = [
'AI 到底在做什么？从认猫开始',
'只见过红色圆积木，就认不出蓝色的了吗？',
'一张图片，怎样变成一串数字？',
'AI 答错以后，到底改了什么？',
'一个小窗口，怎样找出图里的线索？',
'神经网络越深，为什么不一定更好？',
'读到故事结尾，AI 怎样记住开头的红伞？',
'一次接一片文字，AI 怎样写出一段话？',
'这句话里的“它”，到底指谁？',
'AI 接出下一片文字前，里面发生了什么？',
'给 AI 一本笔记本，它就不会忘了吗？',
'大模型越大，就一定越好吗？',
'把八个字母写成四个，和 AI 有什么关系？',
'认出物体，就理解它们的关系了吗？',
'AI 答得像真的，应该怎样检查？',
'校园 AI 助手，什么时候该说“不知道”？',
]

REF = {
'tf': ('TensorFlow，Image classification（官方教程；访问日期：2026-10-05）。','https://www.tensorflow.org/tutorials/images/classification'),
'alex': ('Krizhevsky、Sutskever、Hinton，2012，ImageNet Classification with Deep Convolutional Neural Networks，NeurIPS。','https://proceedings.neurips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html'),
'super': ('Google Developers，Supervised Learning（官方课程；访问日期：2026-10-05）。','https://developers.google.com/machine-learning/intro-to-ml/supervised'),
'lime': ('Ribeiro、Singh、Guestrin，2016，"Why Should I Trust You?": Explaining the Predictions of Any Classifier，第 6.4 节。arXiv:1602.04938。狼与哈士奇实验由研究者刻意构造。','https://arxiv.org/abs/1602.04938'),
'cal': ('Guo 等，2017，On Calibration of Modern Neural Networks，ICML，PMLR 70:1321–1330。','https://proceedings.mlr.press/v70/guo17a.html'),
'csclass': ('Stanford CS231n，Image Classification（课程笔记；访问日期：2026-10-05）。','https://cs231n.github.io/classification/'),
'general': ('Google Developers，Generalization（官方课程；访问日期：2026-10-05）。','https://developers.google.com/machine-learning/crash-course/overfitting/generalization'),
'shortcut': ('Geirhos 等，2020，Shortcut Learning in Deep Neural Networks，Nature Machine Intelligence。arXiv:2004.07780。','https://arxiv.org/abs/2004.07780'),
'png': ('W3C，Portable Network Graphics (PNG) Specification，第三版，第 4.2、4.6、6.1、7.2 节（访问日期：2026-10-05）。','https://www.w3.org/TR/png-3/'),
'pillow': ('Pillow，Concepts / Modes（官方文档；访问日期：2026-10-05）。','https://pillow.readthedocs.io/en/stable/handbook/concepts.html#modes'),
'color': ('W3C，CSS Color Module Level 4，sRGB 表示（访问日期：2026-10-05）。','https://www.w3.org/TR/css-color-4/#sRGB-space'),
'linear': ('Google Developers，Linear regression（官方课程；访问日期：2026-10-05）。','https://developers.google.com/machine-learning/crash-course/linear-regression'),
'loss': ('Google Developers，Linear regression: Loss（官方课程；访问日期：2026-10-05）。','https://developers.google.com/machine-learning/crash-course/linear-regression/loss'),
'gradient': ('Google Developers，Linear regression: Gradient descent（官方课程；访问日期：2026-10-05）。','https://developers.google.com/machine-learning/crash-course/linear-regression/gradient-descent'),
'hyper': ('Google Developers，Linear regression: Hyperparameters（官方课程；访问日期：2026-10-05）。','https://developers.google.com/machine-learning/crash-course/linear-regression/hyperparameters'),
'conv': ('PyTorch，Conv2d（官方文档；访问日期：2026-10-05）。','https://docs.pytorch.org/docs/stable/generated/torch.nn.Conv2d.html'),
'cscnn': ('Stanford CS231n，Convolutional Neural Networks（课程笔记；访问日期：2026-10-05）。','https://cs231n.github.io/convolutional-networks/'),
'resnet': ('He 等，Deep Residual Learning for Image Recognition，2015 预印本／CVPR 2016。arXiv:1512.03385。','https://arxiv.org/abs/1512.03385'),
'identity': ('He 等，2016，Identity Mappings in Deep Residual Networks，ECCV。arXiv:1603.05027。','https://arxiv.org/abs/1603.05027'),
'rnn': ('PyTorch，RNN（官方文档；访问日期：2026-10-05）。','https://docs.pytorch.org/docs/stable/generated/torch.nn.RNN.html'),
'lstm': ('PyTorch，LSTM（官方文档；访问日期：2026-10-05）。','https://docs.pytorch.org/docs/stable/generated/torch.nn.LSTM.html'),
'forget': ('Gers、Schmidhuber、Cummins，2000，Learning to Forget: Continual Prediction with LSTM，Neural Computation 12(10):2451–2471。DOI:10.1162/089976600300015015。','https://doi.org/10.1162/089976600300015015'),
'karpathy': ('Karpathy，2015，The Unreasonable Effectiveness of Recurrent Neural Networks（作者文章）。','https://karpathy.github.io/2015/05/21/rnn-effectiveness/'),
'generation': ('Hugging Face Transformers，GenerationConfig（官方文档；访问日期：2026-10-05）。','https://huggingface.co/docs/transformers/main_classes/text_generation'),
'gpt3': ('Brown 等，2020，Language Models are Few-Shot Learners。arXiv:2005.14165。','https://arxiv.org/abs/2005.14165'),
'token': ('Hugging Face Transformers，Tokenization algorithms（官方文档；原题 Summary of the tokenizers；访问日期：2026-10-05）。','https://huggingface.co/docs/transformers/tokenizer_summary'),
'bahdanau': ('Bahdanau、Cho、Bengio，2014 预印本／ICLR 2015，Neural Machine Translation by Jointly Learning to Align and Translate。arXiv:1409.0473。','https://arxiv.org/abs/1409.0473'),
'transformer': ('Vaswani 等，2017，Attention Is All You Need，第 3 节。arXiv:1706.03762。','https://arxiv.org/abs/1706.03762'),
'explain': ('Jain、Wallace，2019，Attention is not Explanation，NAACL-HLT。DOI:10.18653/v1/N19-1357。','https://aclanthology.org/N19-1357/'),
'gpt1': ('Radford 等，2018，Improving Language Understanding by Generative Pre-Training，第 3 节（技术报告）。','https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf'),
'norm': ('Ba、Kiros、Hinton，2016，Layer Normalization。arXiv:1607.06450。','https://arxiv.org/abs/1607.06450'),
'ntm': ('Graves、Wayne、Danihelka，2014，Neural Turing Machines，第 3、4 节。arXiv:1410.5401。','https://arxiv.org/abs/1410.5401'),
'rag': ('Lewis 等，2020，Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks。arXiv:2005.11401。','https://arxiv.org/abs/2005.11401'),
'scaling': ('Kaplan 等，2020，Scaling Laws for Neural Language Models。arXiv:2001.08361。','https://arxiv.org/abs/2001.08361'),
'chinchilla': ('Hoffmann 等，2022，Training Compute-Optimal Large Language Models，第 4.2.2 节及表 6。arXiv:2203.15556。','https://arxiv.org/abs/2203.15556'),
'gpipe': ('Huang 等，2019，GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism，NeurIPS。arXiv:1811.06965。','https://arxiv.org/abs/1811.06965'),
'mdl': ('Grünwald，2004，A Tutorial Introduction to the Minimum Description Length Principle。arXiv:math/0406077。','https://arxiv.org/abs/math/0406077'),
'weights': ('Hinton、van Camp，1993，Keeping Neural Networks Simple by Minimizing the Description Length of the Weights。DOI:10.1145/168304.168306。','https://www.cs.toronto.edu/~hinton/absps/colt93.html'),
'relation': ('Santoro 等，2017，A Simple Neural Network Module for Relational Reasoning。arXiv:1706.01427。','https://arxiv.org/abs/1706.01427'),
'cite': ('Gao、Yen、Yu、Chen，2023，Enabling Large Language Models to Generate Text with Citations，EMNLP。arXiv:2305.14627。','https://arxiv.org/abs/2305.14627'),
'unesco': ('UNESCO，2024，AI Competency Framework for Students。DOI:10.54675/JKJB9835。作为批判判断、隐私与责任的背景参考。','https://www.unesco.org/en/articles/ai-competency-framework-students'),
}
REFS = [['tf+alex','super','lime','cal'],['csclass','general','shortcut'],['png','pillow+color','tf'],['linear','loss','gradient','hyper'],['conv','cscnn','alex'],['resnet','identity'],['rnn','lstm','forget'],['karpathy','generation','gpt3','token'],['bahdanau','transformer','explain'],['transformer','gpt1','norm'],['ntm','rag'],['scaling','chinchilla','gpipe'],['mdl','weights'],['relation'],['cite','cal','unesco'],['unesco','rag','cite']]

REPLACEMENTS = {
1: [('这很像调好一架乐器，再用它演奏。调音改变乐器的设置，演奏利用已有设置发声。不过，这个比喻只帮助区分两个阶段；模型的训练实际是数字计算，并没有一个在里面练习认猫的小人。','可以把两个阶段比作调音和演奏：调音改变设置，演奏利用已有设置。模型训练则通过数字计算调整参数。')],
2: [('这里所有图形、搭配和成绩，都是为说明问题而设定、按规则逐个算出的示例，我们并没有训练一个神经网络。四个测试例子还刻意换了颜色搭配，用来揭示弱点；0%不能当成真实产品的出错率，4次全对也不能保证以后一直正确。','这是按手写规则算出的示例，没有训练神经网络。测试特意换了颜色搭配来找弱点；0%不是实际产品的成绩，4次全对也不能保证以后一直正确。')],
4: [('刚才我们手动试了0、1、2三个值，并选出表现最好的b＝2。这叫手动搜索。三个值是为讲清原理而挑的，不能把这段过程当成梯度下降的推导。','刚才手动试了0、1、2三个值，选出表现最好的b＝2，这叫手动搜索。梯度下降则有另一套找方向的方法。')],
5: [('到这里为止，模板是我们手工设计的，程序没有学过任何东西。把它称为“已经训练好的CNN”，便跨过了最关键的一步。','这个模板由人手工设定。要从算例走到会学习的CNN，还差训练这一步。'),('橙框表示当前窗口。步长为1、不补边；三次响应组成特征图，平移后高分位置相应移动。','窗口依次覆盖第1至3、2至4、3至5列。步长为1、不补边；原图平移后，特征图的高分位置相应移动。')],
7: [('下面是人为规定的记录办法，只作类比，并没有训练神经网络。我们把刚才的故事分成三步，再加上结尾的问题。','先用人为规定的便签记录法作类比。把故事分成三步，再加上结尾的问题。'),('门的名字容易让人想到一个主动挑选回忆的管理员。实际上，门值来自当前输入、先前状态和已学参数的计算。训练调整相关参数，才可能让网络在合适的时候多保留、少写入；运行时没有一个小人判断“这件事值得记住”。〔3〕','门值由当前输入、先前状态和已学参数计算出来。训练调整相关参数，让网络有机会在合适的时候多保留、少写入。“门”是对数值调节的比喻。〔3〕')],
8: [('因此，“一步只生成一片”说的是输出节奏。每步添上的文字很短，使用的线索却可以来自一大段前文。','因此，“一步只生成一片”说的是这里介绍的生成方式：每次添上的文字很短，线索却可以来自一大段前文。屏幕如何分段显示，还受传输和界面影响，不一定与每个token一一对应。')],
9: [('图1把两种通常的指代理解并排放在一起。图里的连线是作者对句意的分析，没有测量任何模型，也没有声称模型内部必定沿这根线工作。','图1并排画出两种通常的理解，连线表示句意分析。'),('这些是作者设定的示意数值。2不代表“小球”，10也不代表“盒子”；4或8都不是代词指向的答案。句子帮助说明为什么要联系上下文，算式帮助说明加权组合怎样发生，两者不能混成一场真实模型实验。','这组数只演示加权计算：2和10不是“小球”“盒子”的编码，4或8也不是指代答案。它与前面的句子各自说明一步，没有复现真实模型。'),('可以把过程记成“算匹配分数，再分配比重，最后组合信息”。其中“查询”只是数学对象的名字，没有一个小人在发问；“注意力”也不表示电脑集中精神、产生感受或具有意识。','可以把过程记成“算匹配分数，再分配比重，最后组合信息”。“查询”和“注意力”在这里都是计算名称，不代表人的发问、专注或意识。')],
11: [('可以把外部存储比作笔记本，但类比到这里就要收住。机器操作的通常是数组或矩阵，里面是数字；它没有翻书的体验，也不会因为记过一条消息，就形成一个人的生活回忆。','外部存储像一本可查的笔记本，但机器操作的是数字数组或矩阵，并不具备人的回忆体验。'),('这段过程完整说明了存储的最小用途，却没有训练神经网络：格子数量、位置与操作规则都是作者规定的。它展示“存在哪里”和“存了什么”可以分别变化，不能据此声称某个真实AI已经学会安排笔记。','这段手写规则演示了“存在哪里”与“存了什么”的区别。若要让神经网络学会安排读写，还需要训练。')],
12: [('2020年，Kaplan等人研究语言模型，发现测试交叉熵损失与参数量、数据规模、训练计算量之间，在研究设置和范围内呈现可拟合的经验关系，通常称为缩放规律。〔1〕','2020年，Kaplan等人比较了不同规模的语言模型。他们发现，在研究范围内，参数量、数据规模、训练计算量与语言预测损失之间存在可以用曲线描述的关系。这类经验关系通常称为缩放规律。论文用来衡量预测表现的指标叫交叉熵损失。〔1〕'),('在每题前提供5个示例的评估设置下，前者在MMLU知识基准57项任务上的平均准确率为67.6%，后者为60.0%。','在每题前提供5个示例的评估设置下，前者在MMLU知识基准57项任务上的平均准确率为67.6%，后者为60.0%。MMLU可以理解为一组覆盖不同学科的测试题。')],
14: [('关系网络不是处理关系的唯一途径。这里介绍它，是因为“两两组合，再汇总”的结构，让抽象的“看懂联系”有了可以说明的计算入口。我们刚才的形状与箭头均为原创示意，没有训练或测试这篇论文的模型。','关系网络只是处理关系的一种途径。“两两组合，再汇总”的结构，给了我们理解关系计算的入口；前面的手工图示没有复现论文模型。')],
}

REWRITES = {}
REWRITES[6] = '''一层处理过的数据，再交给下一层，最后得到判断。神经网络像一条逐步加工信息的流水线。既然多一道加工能带来更多变化，为什么不一直加层？

写得出更复杂的计算，不代表训练程序就能找到更好的参数。残差连接提供了一条新路线：保留输入，再叠加需要的修正。

> 阅读提示：先看懂“原值＋修正”即可。后面的选读部分会多走一步，解释这条路线怎样影响训练。

## 多几层为什么会添麻烦

假设原来的网络已经能完成任务。新加的几层，最合适的做法可能是什么也不改，把输入原样传下去。可在普通逐层结构中，这件事也需要参数配合，并不会自动发生。

2015年提出的ResNet研究报告过：在论文的实验设置中，某些更深的普通网络，连训练数据上的错误率都高于较浅网络。它不只是“练习做得好，换题却失灵”，而是练习本身也没做好。论文把这种现象称为退化问题。〔1〕

## 留一条原路 再加上修正

用一个小任务看清区别：输入10、20、30，希望分别输出11、21、31。

直接变换时，一段计算负责把输入变成目标。残差结构则把输入分成两路：一路原样传过去，另一路进入可学习的计算F，最后相加。

输出＝输入＋F（输入）

![配图](01_原值与修正相加的残差结构.png)

*图1  原值沿直通路径保留，F分支提供修正，两路相加得到输出。*

F是一段计算，不是固定数字。对这三个样本，如果F都输出1，就得到10＋1＝11、20＋1＝21、30＋1＝31。

如果F输出0，原值便不改变。在这个相加结构中，要表达“这一步保持原样”，只需让修正为0。

“残差”指目标变换相对原输入需要补上的差别。它与损失不同：损失评价预测错得多远，F则直接参与计算输出。训练仍需调整F的参数。〔1〕

这个例子只比较两条计算路线。我们已经知道答案，不代表训练也会立刻找到它，更不能由此证明哪条路线训练更快。

## 有了直通路径 仍要检查结果

残差连接属于跳跃连接的一种。图上虽然画着绕行的路线，但两路都参与计算，F分支也仍然会被执行和训练。它没有临时判断“这题不会，所以跳过”。

真实输入往往是一组数或多张特征图。相加时，要把对应位置的数字加起来，所以两路的形状必须匹配。通道数或尺寸改变时，需要相应的匹配办法，旁路也未必还是简单的原样传递。〔1〕

ResNet论文通过实际实验，展示了残差结构在指定条件下改善训练与识别表现的效果。网络深度、宽度、数据、参数初始值、更新方法和计算预算，仍会影响结果。加上残差，并不保证所有任务都更好。〔1〕

到这里，可以先记住：残差结构让网络在保留输入的基础上学习修正。它给深层网络提供了更容易表达“保持原样”的路线。

## 选读 一点变化怎样沿两路传递

把F设为“输入乘以0.5”。输入2时，F输出1，两路相加为3。把输入调到2.1，F输出1.05，总输出变成3.15。

![配图](02_直通路径与分支的变化量.png)

*图2  输入增加0.1，两路分别贡献0.1和0.05，总输出增加0.15。*

输出的变化，一部分来自直通路径，另一部分来自F。在这个线性例子中，输入每增加1，直通路径贡献1，F贡献0.5，合计1.5。用导数描述，这就是两条路径变化率相加。

训练要从损失往前计算：参数变化会怎样影响结果？这种影响由梯度描述。反向计算经过相加处时，也会计入直通路径的贡献。“恒等路径”就是原样传递输入的路径。〔2〕

这条路径不能保证梯度永远合适。若F改为“输入乘以−1”，两路正好抵消，总输出始终为0。深层训练可能遇到梯度过小或过大的困难，但前面提到的退化问题，不能统统归为梯度消失；原论文也区分了这两件事。〔1〕
'''

REWRITES[10] = '''输入“今天下雨”，语言模型接出一个“了”，再接一个句号。屏幕上只多了两个符号，里面却要把文字变成数字、联系前文，再计算接什么。

下面沿一种简化的生成型Transformer走一遍。我们采用“只用解码器”的结构，先把它理解为一套接着前文生成文字的计算装置。2017年的原始Transformer用于翻译，还包含处理原文的编码器；本文不复刻那套完整架构。〔1,2〕

> 阅读提示：建议先读第8篇的逐步生成和第9篇的注意力。先抓住“文字变数字—结合前文—选下一片”，模块细节可以第二遍再看。

## 文字先取得数字表示

先人为约定，把输入分成“今天／下雨”两个token，也就是文字处理单元。真实分词器未必这样切分；一个字、一个词或词的一部分，都可能对应一个或多个token。

每个token先对应一个编号，再查到一组表示它的数字。这一步叫嵌入，这组数字叫向量。编号只用来查找，不是编号越大，词义就越强。

顺序也必须进入计算。“猫追狗”和“狗追猫”包含相同的字，意思却不同。本例把位置表示加到词的表示中；实际架构也有其他引入位置的方法。〔1〕

这些数字接着经过多层Transformer块。可以把“块”理解为一组反复使用的计算步骤；各层结构可以相同，但通常各有自己的参数。

![配图](01_生成型Transformer的模块路线.png)

*图1  简化的生成路线。每个块包含注意力、前馈、残差与归一化，展开的模块见下文。*

## 一块里面有几种分工

注意力负责联系上下文。本例使用因果自注意力：一个位置只能组合自身及前面位置的信息。“自”表示信息来自同一条序列，“因果”表示不能读后文，不是在证明现实中的因果关系。多头注意力同时做多组组合，再合并结果。〔1〕

前馈网络接着加工每个位置上的数字。它可以先把一组数变成另一组数，再通过非线性处理，让计算不限于简单的倍数关系。在这个子层里，各位置共用一套参数，但不直接混合不同位置的信息。〔1〕

残差连接保留一条原样传递的路线，再与子层结果相加。第6篇讲过，这为信息和训练信号提供了另一条通路。

归一化调整数值的尺度，帮助训练更稳定。这里采用的顺序是：注意力计算→残差相加→归一化，然后前馈计算→残差相加→归一化。其他变体可以把归一化放在不同位置。〔3〕

第一次阅读不必背下所有名字：先联系其他位置，再加工当前位置，同时保留直通路线、调整数值尺度。这几种计算共同形成新的表示。

## 为什么训练时也要遮住后文

假设训练材料有完整的“今天／下雨／了／。”。预测“下雨”时，只应使用“今天”；预测“了”时，只应使用“今天／下雨”。如果先把答案漏进输入，训练成绩就失去原本的意义。

因果遮罩负责阻断未来位置的信息。图2以输入位置为行、可读取的位置为列。每一行算出的结果，用来预测紧接在它后面的token。〔1,2〕

![配图](02_逐位置因果遮罩与下一token.png)

*图2  每行只能读取自身及前面的输入，再预测下一token。灰色位置不可读。*

例如，“下雨”这一行可以读“今天”和“下雨”，不能读“了”。计算注意力权重时，可以排除那些不允许的位置，让它们得到零权重。前面各层的表示也遵守同样限制，避免从其他计算路线带回未来答案。

训练时，正确句子已经给定，所以许多行可以在遮罩限制下同时计算，并分别与正确的下一token比较。并行计算没有取消“不能偷看后文”的规则。

## 走完一次生成

回到输入“今天／下雨”。多层计算结束后，最后一个位置的表示进入输出层，得到词表中各候选的分数。分数通过softmax转成概率分布，再按设定的规则选出下一片文字。〔1,2〕

假设第一轮的候选是：“了”占0.60，“吗”占0.25，“，”占0.15。选择最高概率，就接上“了”。上下文变成“今天／下雨／了”。

第二轮假设“。”占0.80，“，”占0.20，最高概率选择得到句号。本例约定遇到句号停止，于是输出“今天下雨了。”。这些概率由作者设定，不是模型实测。

第二轮要用到第一轮刚选出的“了”；如果先选了“吗”，后面的上下文就变了。采用概率采样时，也可能走出不同续写。两轮都沿用已有参数，把新token接回去不等于重新训练。

实际程序可以缓存已算好的部分结果，减少重复计算。它仍需处理这里介绍的前后依赖关系。

现在，那两个新符号背后的路线便连起来了：文字取得数字表示，在受遮罩限制的多层计算中变换，最后变成候选概率和下一步选择。至于“今天下雨”是否符合真实天气，仍要查外部证据。
'''

REWRITES[13] = '''ABABABAB。这八个字母看着很整齐：AB，AB，AB，AB。照抄不会错，写成“把AB重复四次”，也能让别人还原它。

可这句话本身有多长？如果最后一个B变成C，又该补多少说明？要比较一种规则有多省，规则和例外都得记账。

> 阅读提示：先跟着算9、4、6这三笔小账，再看它怎样联系到模型选择。末尾的理论问题可以选读。

## 先约定每个字符怎样计费

中文句子与英文字母不能直接比长短。我们先约定一套小编码，只处理由A、B、C组成、长度不超过八的串。每个编码字符算一单位，整条消息在哪里结束，双方事先知道。

第一种写法叫直接模式：先写L，再照抄原串。ABABABAB就写成LABABABAB，一共九个字符，计九单位。

第二种叫重复模式：先写R，再写一位重复次数，最后写一个两字母块。次数只允许1到4。R4AB表示“把AB重复四次”，计四单位。

L和R告诉对方该怎样读，不能漏算。两种写法使用同一套读法，才能比较；这里的单位也不是实际文件的字节数。

![配图](13_规则和例外都计入总长度.png)

*图1  在约定的读法下，照抄需要9单位，重复规则需要4单位，补一个例外后需要6单位。*

读到R4AB，先认出重复模式，再把AB展开四次，得到ABABABAB。能够完整还原，才有资格说省了五单位。

## 多一个例外 要多写两个字符

把末位改成C，得到ABABABAC。只写R4AB就不够了，因为展开后的末位仍是B。

我们给重复模式加一条规则：后面可以接“位置一位＋替换字母”。位置从1数到8，每个位置最多改一次。R4AB8C就表示：先展开AB四次，再把第8位换成C。

原来的四单位，加上8和C，共六单位。直接写LABABABAC仍需九单位，所以这次省了三单位。

如果要记录三个替换，就得花4＋2×3＝10单位，反而比直接记录的九单位更长。在这些候选写法中，照抄更省。

规则是否划算，取决于它省下多少记录，又带来多少补充说明。

## 这和选择 AI 模型有什么关系

这笔账连着一种选择模型的思路：最小描述长度，简称MDL。一个直观版本会合计两部分：描述模型要多长，以及知道模型后，描述剩余数据还要多长。〔1〕

在字母串中，“重复AB”像一个小模型，替换记录像它没能解释掉的部分。只图规则短而漏掉C，不能还原；给每个位置都另写一条规则，又可能比照抄更长。

神经网络研究也考虑过类似问题：除了预测误差，还要控制描述权重需要多少信息。〔2〕不过，这不是简单数参数，也不是说所有AI都按本文的编码训练。在统计模型中，剩余数据还可以用概率来编码，不必写成逐项纠错清单。

还要防止把成本藏起来。若先约定“X代表整部书”，再说“一字符就存下全书”，书其实被藏进了字典。专为数据定制的字典，其描述成本也要计入。

简洁的价值，在于找到可以反复利用的规律。把例外和必要说明一起算进去，才知道这种简洁是否划算。它仍不能保证未来：AB重复四次，下一位也可能因新条件而改变，模型还需要独立数据和具体用途的检验。

## 选读 短规则不代表所有事情都更省

本文把重复次数限制为一位。处理更长的串时，多位整数怎样分隔、特殊符号怎样写，都要规定并计费，不能把“一百亿次”塞进仍只收一单位的格子。

描述短，也不代表运行快。某段很短的程序可能要算很久，才能产生结果。描述长度、运行时间，以及复杂系统研究中的结构复杂性指标，回答的是不同问题。

最后，在有限的候选写法中找到较短的一种，不等于找到了所有程序中最短的程序。理论上的最短程序长度存在严格的可计算性限制，不能靠本文两种写法解决。〔1〕
'''

GUIDES = {
7:'> 阅读提示：第4篇讲参数怎样更新；本篇会区分“参数不变”与“状态随故事变化”。',
9:'> 阅读提示：本篇只需要乘法和加法。先看懂两次加权计算，再认识查询、键和值。',
11:'> 阅读提示：先看五格存储的读写，再看加权读取。后者会用到第9篇的加权组合。',
12:'> 阅读提示：本篇分别讨论训练投入和使用成本。看不懂研究名词时，可以先看A、B、C三个方案的比较。',
}

with ZipFile(BACKUP) as backup:
    for i,d in enumerate(sorted(p for p in ROOT.iterdir() if p.is_dir() and re.match(r'^\d\d_',p.name)),1):
        if len(sys.argv)>1 and str(i) not in sys.argv[1:]:continue
        rel=f'{d.name}/公众号_排版用.md'
        old=backup.read(rel).decode('utf8')
        main=old.split('## 资料来源')[0]
        main=re.sub(r'^# .*', '# '+TITLES[i-1], main,count=1)
        if i in REWRITES: main='# '+TITLES[i-1]+'\n\n'+REWRITES[i]
        for before,after in REPLACEMENTS.get(i,[]):
            assert before in main,(i,before)
            main=main.replace(before,after,1)
        if i==9:
            main=main.replace('一字之差改变通常的指代，连线仅表示句意分析。','一字之差改变通常的指代，图中仅展示句意分析。')
            main=main.replace('图1并排画出两种通常的理解，连线表示句意分析。','图1并排展示这两种通常的句意理解。')
        if i==11:
            main=main.replace('图1把四个时刻排在一起，箭头分别标明本步的动作。','图1按四个时刻列出本步动作和存储内容。')
        if i==14:
            main=main.replace('箭头由左侧对象指向蓝方。','图中按从左到右的顺序排列对象。').replace('图1只突出与蓝方有关的比较，其他关系仍可另行记录。','图1用左右排列突出与蓝方有关的比较；这里讨论的箭头，是另一种记录关系的办法。')
        if i in GUIDES:
            pos=main.index('\n## ')
            main=main[:pos].rstrip()+'\n\n'+GUIDES[i]+'\n\n'+main[pos:].lstrip()
        main=main.replace('AI系统','AI 系统').replace('AI产品','AI 产品').replace('真实AI','真实 AI')
        note='文中算例与图解用于说明原理，不是实际模型的测评结果。研究结论对应以下资料。'
        if i==16:note='学校、公告D1、系统与五种检查结果均为虚构案例及纸面推演，不是已部署产品或软件实测。'
        refs=[]
        for j,group in enumerate(REFS[i-1],1):
            entries=[]
            for key in group.split('+'):
                text,url=REF[key]; entries.append(text+'\n\n'+url)
            refs.append(f'〔{j}〕 '+'\n\n'.join(entries))
        result=main.rstrip()+'\n\n## 资料来源\n\n'+note+'\n\n'+'\n\n'.join(refs)+'\n'
        (d/'公众号_排版用.md').write_text(result)
    table=backup.read('公众号发布信息总表.md').decode()
    lines=table.splitlines()
    for idx,line in enumerate(lines):
        if re.match(r'\| \d\d \|',line):
            fields=line.split('|'); number=int(fields[1].strip());fields[2]=' '+TITLES[number-1]+' ';lines[idx]='|'.join(fields)
    table='\n'.join(lines)
    table=table.replace('若正文或配图由 AI 生成或深度辅助，按《人工智能生成合成内容标识办法》（2025-09-01 施行）及平台规则，发布时需勾选"内容由 AI 生成"声明。','按正文、配图的实际制作方式和平台规则填写。属于 AI 生成合成内容的，依据《人工智能生成合成内容标识办法》第十条，主动声明并使用平台提供的标识功能。仅凭“深度辅助”一词不能作统一判断。法规原文：https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm')
    table=table.replace('（公众号编辑器不支持上标）','，方便跨编辑器保留')
    table=table.replace('文末"资料来源"为纯文本参考文献，公众号正文不允许外链，保持原样即可；如需跳转可用"阅读原文"。','文末保留完整资料标题、编号和网址，方便读者查证。链接能否点击，以当前账号编辑器能力为准；不能点击时也保留可复制的网址。')
    table=table.replace('## 各篇信息','5. **手机预览**：粘贴后检查配图是否全部上传、字号是否可读、选读提示是否保留。本站预览不能替代微信后台最终预览。\n\n## 阅读定位\n\n主线面向初中及以上读者，无需编程基础。第6、10、13篇含进阶内容；第6、13篇将深入讨论放在文末选读部分。系列名与篇号放在正文页眉和封面，标题直接呈现当篇问题。\n\n## 各篇信息')
    table=table.replace('放大照片看到的色块，就是像素。','数字照片可以按像素网格表示。')
    (ROOT/'公众号发布信息总表.md').write_text(table+'\n')
    info=backup.read('阅读说明与篇目索引.txt').decode()
    info=info.replace('2026-10-01 整理：','2026-10-05 修订：精简重复说明，增加阅读提示与选读部分，补全资料链接，重排手机配图，同步Markdown、HTML和Word。原稿见“_原稿备份/2026-10-05_修订前.zip”。\n2026-10-01 整理：')
    info=info.replace('正文与DOCX逐字一致（已校验）','正文与DOCX按段落同步；标题在Word中仅调整标点呈现')
    info=info.replace('浏览器打开→点「选中正文」→⌘C→公众号编辑器粘贴即可','浏览器打开→点「选中正文」→⌘C→公众号编辑器粘贴；发送手机预览检查样式和图片')
    info=info.replace('发布前请确认是否需按《人工智能生成合成内容标识办法》勾选"内容由AI生成"声明。','发布前根据实际制作方式和平台规则填写AI标识；属于生成合成内容的，主动声明并使用平台标识功能。')
    info+='\n快捷入口\n打开“发布入口.html”，可查看16篇修订稿、摘要及Word文件。\n阅读定位：初中及以上，无需编程基础；第6、10、13篇含进阶内容。\n'
    (ROOT/'阅读说明与篇目索引.txt').write_text(info)

(ROOT/'.publishing/references.json').write_text(json.dumps(REF,ensure_ascii=False,indent=2))
(ROOT/'.publishing/titles.json').write_text(json.dumps(TITLES,ensure_ascii=False,indent=2))
print('Edited 16 articles and publishing notes')
