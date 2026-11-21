# dsh-claude-code-persona

把 DeepSeek Harness 系统提示词里的**部署文案**整体换成 Claude Code 的写作风格提示词，
工具说明、harness 身份行、模型行照旧保留。

## 它怎么工作

DSH 每次请求都会现场拼 system prompt，拼完会走一个 waterfall 事件
`system-prompt/assemble`。本插件挂在那个事件上：

1. 先 `await next()` 拿到别人拼好的完整段落列表；
2. 按**段名前缀**保留 `tool:`、`mcp-`、`harness:identity`、`deployment:persona-prefix`、
   `context:`、`ui:deliverable`、`free-search:`；
3. 其余（`deployment:persona-suffix`、`plan:policy`、`team:policy`、`app:web-surface`，
   以及未来任何新插件的未知段）全部丢弃；
4. 把 `prompts/claude-code-persona.md` 作为一个 `interpolate: false` 的段插在模型行之后。

用 waterfall 而不是 `complete: true` 的原因：complete 段会让工具文档一起消失，模型
就不知道该调 `ops_bash` 还是 `read` 了。

按前缀而不是按段名全量枚举的原因：DSH 升级后新增的部署段落会自动被替换掉，不需要
跟着改代码；被替换的段名会打一行日志，需要保留时把它加进 `keepPrefixes` 即可。

## 安装

```bash
node "E:\DeepSeekHarness\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js" plugin --profile web add \
  "file:E:/DeepSeekHarness/WorkSpace/dsh-plugins/dist/dsh-claude-code-persona-1.0.0-<时间戳>.tgz"
```

然后在 `C:\Users\MSI-ZYQ\.dsh\profiles\web\package.json` 的 `dsh.profile.bundles` 里加上
`"dsh-claude-code-persona"`，重启 DSH。装好后 `node_modules/dsh-claude-code-persona` 是一份**真实拷贝**
（不是链接），源目录可以随便移动或删除。

## 配置（`cordis.patch.yml` 里的 `config`）

| 键 | 默认 | 作用 |
| --- | --- | --- |
| `enabled` | `true` | 关掉后插件完全不注册事件 |
| `promptFile` | 包内 `prompts/claude-code-persona.md` | 换一份自己的提示词 |
| `sectionName` | `claude-code:persona` | 插入段的段名 |
| `keepPrefixes` | 见上 | 保留段的名称前缀 |
| `dropNames` | `[]` | 强制丢弃的段名（优先级高于 keep） |
| `insertAfter` | `harness:identity`, `deployment:persona-prefix` | 插入位置锚点，取最后命中的那个 |
| `logDropped` | `true` | 每个不同的丢弃集合只打一次日志 |

提示词文件按 mtime 缓存，**改文件即生效**，下一个请求就会用新内容，不用重启。

## 验证

```bash
# 配置层确实挂上了
node "E:\DeepSeekHarness\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js" --profile web --dump-config | grep claude-code-persona

# 重写逻辑本身（不需要启动 harness）
node test.mjs        # ok: 8 assertions passed
```

## 跟随更新

**Claude Code 升级时**（提示词会变）：

```bash
node E:\DeepSeekHarness\WorkSpace\claude-code-prompt\sync-all.mjs --check      # 看版本差
node E:\DeepSeekHarness\WorkSpace\claude-code-prompt\sync-all.mjs --recapture  # 重抓 + 重建
node E:\DeepSeekHarness\WorkSpace\claude-code-prompt\sync-all.mjs              # 只用现有语料重建
```

重抓会走 `capture/probe.cjs`（假 Anthropic 端点）+ `claude -p` + `extract.cjs` + `assemble.cjs`，
再经 `sync-persona.mjs` 生成 `prompts/claude-code-persona.md`。

**安装形态是 tarball 而不是链接**：profile 里写的是
`file:E:/DeepSeekHarness/WorkSpace/dsh-plugins/dist/dsh-claude-code-persona-<版本>-<时间戳>.tgz`，
运行的是这份拷贝，所以源目录删掉也不影响已装好的插件。代价是改提示词必须重装——`sync-all.mjs`
的最后一步会自动 `npm pack` + `dsh plugin --profile web add file:<新 tgz>`（文件名带时间戳，
避免 pnpm 复用旧条目），并保留最近 3 个包。只想重建不想重装就加 `--no-install`。

装完若当前会话仍是旧提示词，重启 DSH 即可；新会话一定用新提示词。

**DSH 升级时**：插件不用改。看日志里这一行

```
[claude-code-persona] replaced 6 section(s): app:web-surface, deployment:persona-suffix, plan:policy, team:policy, ...
```

如果里面有你想留下的段（比如 `team:policy` 是 AgentTeams 工具的使用说明），把它加进
`cordis.patch.yml` 的 `keepPrefixes` 或单独写进 `dropNames` 的反面即可。

## 卸载 / 回滚

1. 在 profile 的 `package.json` 的 `dsh.profile.bundles` 里删掉 `dsh-claude-code-persona`；
2. `node <dsh>/lib/bin.js plugin --profile web remove dsh-claude-code-persona`；
3. 重启 DSH。

只想临时停用就把它 `config.enabled` 设成 `false` 并重启（或改 `cordis.patch.yml`，该 profile 是热重载）。

## 许可

`prompts/claude-code-persona.md` 的正文来自 Anthropic 的 Claude Code 系统提示词。
本机自用、参考写法没问题；对外分发或放进商业产品前请先确认许可。工具名、模型名、
memory 路径这类写死的东西已经在生成时映射或剔除。
