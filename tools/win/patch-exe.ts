/*
 * 把 Neutralino 的 Windows 运行时打包成单文件软件：
 *   1. 替换程序图标、写入版本信息（resedit / pe-library，MIT 许可）
 *   2. 把 resources.neu 作为 RT_RCDATA 资源 "NEUTRALINOJS_RESOURCES_NEU" 嵌入（与官方 neu build --embed-resources 相同的资源名）
 *   3. 打开 postject 哨兵开关，让运行时从内嵌资源读取页面
 * 用法：node patch-exe.cjs <neutralino-win_x64.exe> <resources.neu> <icon.ico> <输出.exe> <版本号>
 */
import * as PE from 'pe-library';
import * as ResEdit from 'resedit';
import * as fs from 'fs';

const [, , inExe, resNeu, icoPath, outExe, version = '2.1.0'] = process.argv;
if (!inExe || !resNeu || !icoPath || !outExe) {
  console.error('用法：node patch-exe.cjs <neutralino-win_x64.exe> <resources.neu> <icon.ico> <输出.exe> [版本号]');
  process.exit(1);
}
const EN_US = 1033;
const exe = PE.NtExecutable.from(fs.readFileSync(inExe), { ignoreCert: true });
const res = PE.NtExecutableResource.from(exe);

// 1) 图标
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, EN_US, ico.icons.map(i => i.data));

// 2) 版本信息
const [ma, mi, pa] = version.split('.').map(n => parseInt(n, 10) || 0);
const vi = ResEdit.Resource.VersionInfo.createEmpty();
vi.setFileVersion(ma, mi, pa, 0, EN_US);
vi.setProductVersion(ma, mi, pa, 0, EN_US);
vi.setStringValues({ lang: EN_US, codepage: 1200 }, {
  ProductName: '弹珠游园会',
  FileDescription: '弹珠游园会 · 活动抽奖弹珠小游戏',
  InternalName: 'pinball-fair',
  OriginalFilename: '弹珠游园会.exe',
  ProductVersion: version,
  FileVersion: version,
  LegalCopyright: 'Built with Neutralinojs (MIT)'
});
vi.outputToResourceEntries(res.entries);

// 3) 内嵌页面资源
const neu = fs.readFileSync(resNeu);
const RES_NAME = 'NEUTRALINOJS_RESOURCES_NEU';
for (let i = res.entries.length - 1; i >= 0; i--) {
  const e = res.entries[i];
  if (e.type === 10 && e.id === RES_NAME) res.entries.splice(i, 1);
}
res.entries.push({ type: 10, id: RES_NAME, lang: EN_US, codepage: 0, bin: neu.buffer.slice(neu.byteOffset, neu.byteOffset + neu.byteLength) });
res.outputResource(exe);
const out = Buffer.from(exe.generate());

// 4) 哨兵开关 :0 → :1
const fuse = Buffer.from('POSTJECT_SENTINEL_fce680ab2cc467b6e072b8b5df1996b2:');
const at = out.indexOf(fuse);
if (at < 0 || out.indexOf(fuse, at + 1) >= 0) throw new Error('哨兵开关数量不对，无法确认嵌入模式');
out[at + fuse.length] = '1'.charCodeAt(0);

fs.writeFileSync(outExe, out);
console.log(`已生成 ${outExe}（${(out.length / 1024 / 1024).toFixed(2)} MB，内嵌资源 ${(neu.length / 1024 / 1024).toFixed(2)} MB）`);
