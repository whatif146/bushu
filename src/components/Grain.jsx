// 颗粒层：全站只放一个，挂在 App 最外层。z-index 必须低于 Modal(100)，
// 且 pointer-events:none，否则整站点不动（design-spec §10.1）。
export default function Grain() {
  return <div className="grain" aria-hidden="true" />
}
