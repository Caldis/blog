# 2016 → 2026 十年空白:可以填什么

> 上下文:2016-03 发完 SVG 黏黏球那篇之后,博客中断了整整十年,中间没有公开文章。这段时间的"原料"其实不少——主要以 Notion、Obsidian、记忆笔记的形式散落——但都是工匠笔记,不是游记/随感。
> 以下是一次快速扫描后值得考虑改写成文的素材清单,按可操作性排序。

## A. 高优先级(半成品,有真实项目背书)

### A1. Agent-Friendly CLI 设计模式
- **来源**:memory `20250801-agent-cli-patterns`
- **落地项目**:`tv-keyremap`(switch.sh)、`tv-vigil`(vigil.sh)
- **核心**:
  - `--json` 双模输出(human/machine)
  - 语义化退出码
  - `agent.json` 清单
  - 安全边界
  - 多 Agent 协作流程(Claude 写代码 → Codex review → 修复 → 提交)
- **写作角度**:"给 AI 当一等公民设计命令行" 的第一手实践
- **调性**:和 2016 年 SVG 滤镜那篇一个味道——讲透一个具体技术,带可跑通的代码

### A2. Surge + UniFi 家庭网络的"核心-辐射"拓扑
- **来源**:memory `20250715-home-network`
- **核心**:
  - UniFi 路由 (.1) → Mac mini / Surge (.250, DHCP+DNS 198.18.0.2) → 代理设备
  - Surge DHCP 配置文件位置
  - 为什么不用 UniFi 自带 DHCP
- **写作角度**:"把家里一台常年开机的 Mac 变成整个家庭的网关中枢"
- **风险**:涉及 IP 分配表,发表前要脱敏

### A3. Sony TV 的按键重映射 + 后台应用守夜人
- **来源**:memory `20250701-tv-keyremap`、`20250701-tv-vigil`
- **核心**:
  - 用 ADB 把"视频"按键重定义为启动自选应用
  - 用 LaunchAgent + ADB 每隔 N 秒 ping 目标应用,防止 TV 杀后台
  - Mac mini 做 watchdog 主机
- **写作角度**:"对付 Android TV 杀后台,我架了一个守夜人"
- **读者画像**:有 Sony/Android TV 的极客

## B. 中优先级(需要补写)

### B1. Multi-Agent CLI 互操作
- **来源**:memory `20260219-multi-agent-cli-interop`
- **核心**:Claude Code / Codex / Kimi / Copilot 之间的 token 经济、协作模式
- **难点**:内容还在快速演化,发表后容易很快过时

### B2. FoloToy ESP32 AI 语音玩具逆向
- **来源**:memory `20260221-folotoy-esp32-device`
- **状态**:设备信息已记录,但分析未成文
- **潜力**:消费级 AI 硬件的开箱拆解在中文技术圈少见

### B3. united-memory 项目:跨 Agent 结构化记忆系统
- **来源**:memory `20250219-united-memory-project`,GitHub: Caldis/united-memory
- **核心**:Zettelkasten 式的 agent 记忆,Git 同步,插件架构
- **角度**:自己用了几个月的一手反馈 + 设计取舍

## C. 低优先级(材料稀薄,需要大量二次写作)

- Obsidian `Archive/归档/` 里的:PWA 总结、ES Module、SwiftUI、HomeAssistant、SD Prompt、演讲稿、五周年、造单脚本、配送流问题点
- 这些是工作笔记,公开前需要脱敏 + 扩写,投入产出比较低

## D. 元话题:恢复这些老文章的过程,本身值得写一篇

> 用户原话:"这个文章恢复的过程都很适合写为文章"

### 素材清单
- 从 9 字 prompt 到 Wayback 的探索链
- 为什么 Obsidian 里三份空 BLOG 文件夹反而是重要信号(null result)
- CNAME 指向 `mos.caldis.me` 那一刻的拐点
- ruozu-webapp + LeanCloud 的死亡路径 vs ruozu-x 静态站的幸存路径
- Koken CMS 的 `/essays/` 聚合页作为唯一一次有效归档
- 恰好在 2016-08-03 抓到、2016-03 刚发、中间只差 4 个月 → 归档时效只有几个月
- u2sk.com 后期被抢注成盗版影音站,后续归档全污染

### 四条方法论总结(已在对话中成型)
1. **空结果也是信号** —— 空 BLOG 文件夹告诉我"不该在 Obsidian 找"
2. **跟着 CNAME 走** —— 30 字节的重定向决定时间轴
3. **云后端 SPA 对考古不友好** —— ruozu-webapp + LeanCloud 等同于提前挖坟
4. **聚合页优先级 > 单篇页** —— Wayback 抓一页救一年

### 可能的标题候选
- "从 9 个汉字到 10 年前的一篇 SVG 黏黏球"
- "博客考古学:我是怎么从一堆空文件夹里挖出自己十年前的写作"
- "一次 Wayback Machine 救场"

### 调性
- 口语化,像复盘一次侦探工作
- 大量具体路径、具体域名、具体时间戳
- 配上关键节点的截图/目录树
- 结尾上升到方法论,但保持克制

### 附带彩蛋
- Filco 文章的本地版本比 Wayback 版还全,是因为后期迁站时做了扩写——这个细节值得展开
- "炸" 这篇 2016 年自己就写着"旧文章已丢失",十年后这句话还在原位——像一块博客化石

## 下一步

- 从 A1 开始试水,单篇打样看新站调性是否承得住
- 如果 A1 反响好,再批量补 A2 / A3
- D 这篇可以和 A1 并行,两者调性互补
