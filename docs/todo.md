# todo

## frontend / UI

- **Notifikaatioiden hallinta**: "Sinun vuorosi" -notifikaatio oletuksena pois päältä ✓ (toteutettu asetuksiin)

## backend

## backend + frontend

- **Uniikki väri/symboli/nimi**: Pelaajilla ei saa olla sama väri, symboli tai nimi. Backend hylkää päällekkäisyydet; frontend estää valinnan. Odotushuoneessa boteille generoidaan uudet arvot tarvittaessa kun uusi pelaaja liittyy. (P2)
- **Botin failsafe**: Jos botin vuoro jää jumiin, automaattinen palautus + lokimerkintä. (P2) Pelaaja saa pelata sen vuoron jos botilta ei ole tullut toimintoa x ms aikana.
- **"Kerää kaikilta" -kortti**: Per-pelaaja velkaLogiikka — vuoro ei saa vaihtua ennen kuin kaikki pelaajat ovat maksaneet tai menneet konkurssiin. (P3)

## kehitystyökalut
- pystytä axiom mcp <- älä vielä tee

## muut, ei kategorisoitu vielä

- odotushuone paranteluja: Bottien nimet/värit/symbolit aina satunnaiset.
- eventlogi: aikaleiman ryhmittely (näytä aika vain kun muuttuu, ei joka rivillä)
- eventlogi: suodatinrivit (kaksi riviä) yhdistettävä yhdeksi wrappivaksi riviksi
