# ซิงเจียน · ห้องชมวิวอวกาศส่วนตัว (ฉบับภาษาไทย)

ธีม SillyTavern ที่ย้าย Tavern ขึ้นไปอยู่ในยานอวกาศส่วนตัว ชมทางช้างเผือก วงแหวนดาว หรือรุ่งอรุณบนวงโคจรผ่านหน้าต่าง แล้วเปิดแฟ้มตัวละครเพื่อเข้าสู่หน้าสื่อสารแบบโฮโลแกรม

- **ผู้สร้างต้นฉบับ:** lanjiu — [krystalqiye-lj/xingjian-cabin](https://github.com/krystalqiye-lj/xingjian-cabin)
- **แปลภาษาไทย:** mangkoodkung — [mangkoodkung/xingjian-cabin](https://github.com/mangkoodkung/xingjian-cabin)

## ติดตั้งฉบับภาษาไทย

ใน **SillyTavern → ส่วนขยาย (Extensions) → ติดตั้งส่วนขยาย (Install extension)** วางลิงก์ด้านล่าง แล้วรีเฟรชหน้า

```text
https://github.com/mangkoodkung/xingjian-cabin
```

## สัญญาอนุญาต

ซอร์สโค้ดของธีมเป็นของ lanjiu ภายใต้ [MIT License](LICENSE) ฉบับแปลนี้คงข้อความลิขสิทธิ์และสัญญาอนุญาตเดิมไว้ทั้งหมด ฟอนต์และเสียงเป็นของเจ้าของแต่ละรายตามสัญญาอนุญาตของตัวเอง ดู [ASSETS.md](ASSETS.md) และไฟล์ `OFL.txt` ในโฟลเดอร์ [fonts](fonts)

ฟอนต์ที่มากับธีมไม่มีตัวอักษรไทย ข้อความไทยจึงแสดงด้วยฟอนต์ของระบบ

---

## README ต้นฉบับ (ภาษาจีน)

# 星间 · 私人观景舱

把酒馆搬进一座私人飞船。可以看看舷窗外的银河、星环或轨道晨光，打开角色档案后进入安静的全息通讯页。进入对话时舱室按钮和环境声会收起，给故事留出空间。

## 安装

在 **SillyTavern → 扩展程序 → 安装扩展程序**，粘贴下面的链接，安装后刷新酒馆即可。首次安装且只有这套主题时，刷新后就会进入星间。

```text
https://github.com/krystalqiye-lj/xingjian-cabin
```

使用 SillyTavern 1.19.0 验证，主题本身无需酒馆助手。电脑和手机浏览器访问同一个酒馆时，服务端装一次即可。安卓 Termux 本机运行酒馆时，在手机自己的酒馆里完成相同操作。其他酒馆客户端的兼容性取决于它对 SillyTavern 扩展的支持。

## 使用

- 在舷窗控制栏换窗景、开启**白噪音**，在**舱室设置**调音量。
- 从**全部角色**打开通讯。右上角的 **Aa** 可调字体，手机可以点角色名看头像，电脑可以拖动通讯框左边缘调宽度。
- **菜单 → 扩展 → 管理扩展**可以更新或停用。
- 如果也装了森林，打开 **舱室设置 → 前往林间拾叶**。切换后酒馆会刷新，并在当前浏览器记住所选主题。只有一个主题时直接使用即可。[林间拾叶](https://github.com/krystalqiye-lj/forest-tavern)

可下载、修改和再发布主题源码，见 [MIT 授权](LICENSE)。字体、录音等第三方素材依各自许可使用，见 [素材署名](ASSETS.md)。想为系列加入新主题，可参考 [扩展接入说明](THEME_INTEGRATION.md)。

修改舱室模板或场景样式时，编辑 `source/index.html`、`source/cabin.css`，再运行 `python3 source/build_live.py --refresh-markup`。通讯页的排版可以直接改 `reader.css`。普通安装无需执行构建命令。
