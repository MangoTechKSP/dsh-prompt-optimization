# dsh-optimized-persona

把 DeepSeek Harness 的部署文案替换成一套精简、克制的工作风格提示词：短规则、显式优先级、答案大小随问题而定。

## 它怎么做

DSH 发出请求前会用命名分区拼系统提示词，并在拼装阶段跑一个 waterfall 钩子 `system-prompt/assemble`。本插件挂在这个钩子上：

- **只丢弃一个分区**：`deployment:persona-suffix`（部署自己的文风说明），因为本插件的文本正是要替换它；
- **其余分区全部保留**——工具说明、MCP、身份行、模型行、`plan:`、`team:`，以及**任何其它插件贡献的分区**；
- 然后在 `harness:identity` / `deployment:persona-prefix` 之后插入自己的文本。

早期版本用的是白名单（只保留已知前缀），那会连带删掉别人的分区，所以现在改成黑名单，默认只丢一条。要额外丢什么，用 `dropPrefixes` / `dropNames` 显式写。

因为只依赖插件/分区名的约定、运行时不 import `@deepseek-ai/*`，profile 用 link 还是复制安装都同样工作；DSH 升级改写了内置分区也不会静默破坏，丢掉的段名会打一行日志。

## 安装

```bash
npm pack ./packages/dsh-optimized-persona            # 在仓库根目录
dsh plugin --profile web add "file:$PWD/dsh-optimized-persona-1.0.0.tgz"
```

改完重启，或让 `patchReload: live` 自己捡起来。

## 配置

| 键 | 默认 | 含义 |
| --- | --- | --- |
| `enabled` | `true` | 设 `false` 即完全不改系统提示词，无需卸载。 |
| `promptFile` | 内置 `prompts/optimized-persona.md` | 换用另一份文本；文件 mtime 变化后会重读。 |
| `sectionName` | `optimized:persona` | 注入分区的名字；注册两次是替换而不是追加。 |
| `dropPrefixes` | `['deployment:persona-suffix']` | 按名称前缀丢弃的分区。 |
| `dropNames` | `[]` | 按完整名称丢弃，优先于 `dropPrefixes`。 |
| `insertAfter` | `harness:identity`、`deployment:persona-prefix` | 插入位置（取命中的最后一个锚点）。 |
| `logDropped` | `true` | 每种被丢弃的分区名只打一次日志，DSH 升级后靠它发现变化。 |
| `imageGuidance` | `auto` | 只有当前路由真的挂了图片工具（`read_image`、`browser_real_screenshot`、`screen_shot`、`univer_screenshot`）时才保留“可以把图片放进回复”的段落；`always` / `never` 可强制。 |

## 编辑与测试

`prompts/optimized-persona.md` 就是整份提示词，改完下一个请求生效。

```bash
node test.mjs
```

测试不启动 harness，验证：分区保留与丢弃、插入位置、同一钩子跑两遍不重复插入、图片段落的三种模式，以及没有残留的、本 harness 不存在 的工具名。

## 许可

Apache-2.0，见仓库根目录 `LICENSE`。
