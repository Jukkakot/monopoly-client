# todo

## frontend / UI

- voisko tosta sivu-alueesta tehdä oikeastaan customoitavan? eplaaja voi drag/droppaa "tabeja" mihin haluaa ja käsin muutella niiden kokoja.
- globaaliin ohjeisiin pitäs lisätä, että pidä aina huoli sitä että mikää komponentti ei clippaannu pois näkyviltä.
- **Notifikaatioiden hallinta**: Ratkaise miten toimitaan kun notifikaatioita tulee paljon. "Sinun vuorosi" -notifikaatio oletuksena pois päältä. (P3)
- **Huutokaupan UI**: Selkeytä mitä mikäkin elementti tarkoittaa. Harkitse "all in" -nappia. (P3)
- **Kiinteistöt pelilaudalla väriryhmittäin**: Ihmispelaajan omistamat kiinteistöt näkyvät laudalla ryhmiteltynä värin mukaan — kiinnitystila ruksilla, talot/hotelli kiinteistön päällä. (P4)
- **Odotushuone — logon valinta**: Liittyessä pitäisi voida valita token, väri ja nimi. (P3)
- **Lunasta/panttaa — visuaalinen erottelu**: "Kiinteistöt"-välilehdellä lunasta- ja panttaa-napit erottuvat selkeämmin — esim. lunasta vihreä, panttaa punainen. (P3)
- **Verkkolatenssi debug-tilassa**: Verkkolatenssi näkyviin UI:lla debug-modessa. (P4)
- **Ilmoitusasetukset**: Mahdollisuus säätää mitkä ruutunotifikaatiot näkyvät. (P4)

## backend

- **OpenAPI: session id ei ole UUID**: OpenAPI-spec väittää session id:n olevan UUID, mutta se ei enää ole. Korjaa schema. (P3)
- **Audit-lokitus**: Bäkkärin HTTP-kutsuille ja vastauksille audit-loki jossain vaiheessa. (P4)

## backend + frontend

- **Pelaajan poistuminen**: LeaveGame-komento + ilmoitus muille pelaajille pelin aikana. Nyt poistuminen on hiljaa eikä muut tiedä. (P2)
- **Uniikki väri/symboli/nimi**: Pelaajilla ei saa olla sama väri, symboli tai nimi. Backend hylkää päällekkäisyydet; frontend estää valinnan. Odotushuoneessa boteille generoidaan uudet arvot tarvittaessa kun uusi pelaaja liittyy. (P2)
- **Botin failsafe**: Jos botin vuoro jää jumiin, automaattinen palautus + lokimerkintä. (P2)
- **"Kerää kaikilta" -kortti**: Per-pelaaja velkaLogiikka — vuoro ei saa vaihtua ennen kuin kaikki pelaajat ovat maksaneet tai menneet konkurssiin. (P3)

## validoi / testaa

- **Bottien kortit**: Sama popup ActionPanelissa ilman OK-nappia, häviää automaattisesti botin kuitattua. Validoi ennen poistamista.
- **Siirry lähimmälle laitokselle -kortti**: Tarkista miten tämän kuuluisi toimia ja validoi toteutus.

## kehitystyökalut
- pystytä axiom mcp
- vieläkin pelaajien napit jää esim kiinteistön omistuksen väriviivan alle.
