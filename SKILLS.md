# Skills for UT Auto Register

Skills are stored in `C:/Users/saaqi/.claude/skills/` and auto-loaded by Claude Code.

## Active Skills for This Project

| Skill | Trigger |
|-------|---------|
| `ut-registration-automation` | Working on registration flow, utdirect.utexas.edu specifics, EID auth, DOM selectors |
| `content-script-form-automation` | Filling/submitting forms via content script, MutationObserver chaining, event dispatch |
| `network-request-capture-replay` | Parallel fetch approach, intercepting AJAX, replaying requests at max speed |
| `chrome-extension-messaging` | Popup ↔ content script messaging, async sendMessage, channel management |
| `chrome-extension-reload` | Dev workflow — reloading extension, inspecting popup vs content script |

## How Skills Work

Skills are loaded automatically when their `description` matches the current task. You can also invoke them explicitly:

```
Use the ut-registration-automation skill
Use the network-request-capture-replay skill
```

## Skill Paths

```
~/.claude/skills/
  ut-registration-automation/SKILL.md
  content-script-form-automation/SKILL.md
  network-request-capture-replay/SKILL.md
  chrome-extension-messaging/SKILL.md      (pre-existing)
  chrome-extension-reload/SKILL.md         (pre-existing)
```
