import styles from './KeyboardHelp.module.css'

const SHORTCUTS = [
  { key: 'Välilyönti', desc: 'Heitä nopat / Lopeta vuoro' },
  { key: 'B', desc: 'Osta kiinteistö (kun mahdollista)' },
  { key: 'D', desc: 'Ohita → huutokauppa' },
  { key: 'P', desc: 'Passi huutokaupassa' },
  { key: '↑ / +', desc: 'Tarjoa +10 huutokaupassa' },
  { key: 'Esc', desc: 'Sulje valinta / paneeli' },
  { key: 'M', desc: 'Mykistä / avaa äänet' },
  { key: '?', desc: 'Näytä/piilota tämä ohje' },
]

interface Props {
  onClose: () => void
}

export default function KeyboardHelp({ onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>Pikanäppäimet</div>
        <table className={styles.table}>
          <tbody>
            {SHORTCUTS.map(({ key, desc }) => (
              <tr key={key}>
                <td><kbd className={styles.kbd}>{key}</kbd></td>
                <td className={styles.desc}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className={styles.close} onClick={onClose}>Sulje</button>
      </div>
    </div>
  )
}
