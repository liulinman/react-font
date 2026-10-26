import { brand } from '../../../branding/freewing/brand.mjs';
import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';
import sidebar from '../site-map.json';

export default defineConfig({
  lang: 'zh-CN',
  title: brand.name,
  description: '技术与实践：从知识原理走到真实代码与可验证实例',
  base: '/docs/',
  srcDir: 'content',
  outDir: 'dist',
  cleanUrls: true,
  vite: { publicDir: fileURLToPath(new URL('../public', import.meta.url)) },
  lastUpdated: false,
  ignoreDeadLinks: false,
  head: [['link', { rel: 'icon', type: 'image/png', href: `/docs${brand.favicon}` }]],
  themeConfig: {
    logo: { src: brand.symbol, alt: brand.name },
    siteTitle: `${brand.name} · 技术与实践`,
    nav: [
      { text: '开始阅读', link: '/start/overview' },
      { text: 'MCP 实战', link: '/mcp/query-words' },
      { text: '返回学习平台', link: 'https://124.223.157.129/englishWorld/ai-listening', target: '_self', noIcon: true },
    ],
    sidebar,
    outline: { label: '本页内容', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '切换主题',
    sidebarMenuLabel: '文档目录',
    returnToTopLabel: '返回顶部',
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            tokenize: (text: string) => Array.from(new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(text.toLowerCase())).filter(part => part.isWordLike).map(part => part.segment),
          },
        },
        locales: { root: { translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: { noResultsText: '没有找到相关内容', resetButtonTitle: '清空搜索', backButtonTitle: '关闭搜索', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } },
        } } },
      },
    },
    footer: { message: '知识 · 技术 · 实例', copyright: `${brand.name} · 文档随项目发布` },
  },
});
