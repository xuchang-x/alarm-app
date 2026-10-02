# UI 调研与原型产出模板

这个模板用于 `kit-design-prototype` 的模式 A 和模式 C。项目可以替换示例文字，但应保留来源、页面覆盖和比较结构。

## research.md 模板

```markdown
# {NNN} {功能名称} UI 开源样式调研

以下方案均来自公开源码仓库或官方设计系统页面。原型只借鉴设计语言和组件组织方式，不直接复制第三方产品页面。

| # | 方案 | 开源来源 | 许可证 | 适配范围 | 适合本项目的原因 |
|---:|---|---|---|---|---|
| 1 | {方案名} | [{仓库或文档}]({URL}) | {MIT/Apache-2.0/...} | {React Native/Web/跨端参考} | {理由} |

## 套用到当前项目后的方向

1. **{方案名}**：{色彩、布局、控件和页面组织方式}。

## 推荐观察点

- {迁移成本/视觉亲和力/信息密度/核心业务差异化}

## 当前选定（已确认时填写）

- 视觉基础：{方案}
- 首版主题：{主题和 token}
- 保留的现有交互：{列表/左滑/周期快捷操作等}
```

## 页面清单模板

每套方案使用同一组页面和示例数据：

- 首页列表：有数据、已暂停数据、周期提醒下次日期；
- 创建闹钟：时间、一次/每天/每周/周期切换、对应设置项、标签、贪睡；
- 编辑闹钟：已有数据、保存修改、删除或返回入口；
- 空状态：说明文案和创建第一个闹钟入口；
- 按需求添加加载、错误、保存失败状态。

## HTML 方案数据模板

```html
<script>
  const variants = [
    {
      id: 'a',
      title: '1 · {方案名}',
      subtitle: '{一句视觉描述}',
      badge: '{迁移成本低/突出周期/...}',
      source: '{仓库或组织/项目}',
      license: 'MIT',
      url: '{官方来源 URL}',
      note: '{适合本项目的原因}',
      platform: 'React Native',
      timeline: false
    }
  ];

  const state = {
    screen: 'home',
    type: 'cycle',
    enabled: []
  };
</script>
```

## HTML 页面导航模板

原型顶部至少提供：

```html
<div class="toolbar" role="tablist" aria-label="页面切换">
  <button class="active" data-screen="home">首页列表</button>
  <button data-screen="create">创建闹钟</button>
  <button data-screen="edit">编辑闹钟</button>
  <button data-screen="empty">空状态</button>
</div>
```

每个页面函数都接收当前方案对象，保证相同业务内容被不同视觉 token 渲染：

```js
function renderScreen(variant, index) {
  if (state.screen === 'home') return home(variant, index);
  if (state.screen === 'create') return form(variant, false);
  if (state.screen === 'edit') return form(variant, true);
  return empty(variant);
}
```

## 交互最低要求

- 首页开关可以切换已开启/已暂停状态；
- 创建/编辑页切换一次、每天、每周、周期时，相关字段动态变化；
- 空状态的主按钮能切换到创建页；
- 方案来源链接可以打开官方仓库或文档；
- 每套方案的页面导航和示例数据一致，只有视觉 token 和交互组织差异。
