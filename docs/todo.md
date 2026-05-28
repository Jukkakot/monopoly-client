# todo

## frontend / UI


- tää on jo kivva, mut tässäkin toi väriraita vois olla selkeemmin et sen värinen kiinteistö on kyseessä. nyt toi jää helposti huomaamatta: ![alt text](image-12.png) mun puolesta vaiks koko se rivi vois olla sen värinen eikä vaan se vasen reuna.
- voisko tosta sivu-alueesta tehdä oikeastaan customoitavan? eplaaja voi drag/droppaa "tabeja" mihin haluaa ja käsin muutella niiden kokoja.
- globaaliin ohjeisiin pitäs lisätä, että pidä aina huoli sitä että mikää komponentti ei clippaannu pois näkyviltä.
- **Notifikaatioiden hallinta**: Ratkaise miten toimitaan kun notifikaatioita tulee paljon. "Sinun vuorosi" -notifikaatio oletuksena pois päältä. (P3)
- **Huutokaupan UI**: Selkeytä mitä mikäkin elementti tarkoittaa. Harkitse "all in" -nappia. (P3)
- **Kiinteistöt pelilaudalla väriryhmittäin**: Ihmispelaajan omistamat kiinteistöt näkyvät laudalla ryhmiteltynä värin mukaan — kiinnitystila ruksilla, talot/hotelli kiinteistön päällä. (P4)
- **Odotushuone — logon valinta**: Liittyessä pitäisi voida valita token, väri ja nimi. (P3)
- **Lunasta/panttaa — visuaalinen erottelu**: "Kiinteistöt"-välilehdellä lunasta- ja panttaa-napit erottuvat selkeämmin — esim. lunasta vihreä, panttaa punainen. (P3)
- **Ilmoitusasetukset**: Mahdollisuus säätää mitkä ruutunotifikaatiot näkyvät. (P4)

## backend

- **OpenAPI: session id ei ole UUID**: OpenAPI-spec väittää session id:n olevan UUID, mutta se ei enää ole. Korjaa schema. (P3)
- **Audit-lokitus**: Bäkkärin HTTP-kutsuille ja vastauksille audit-loki jossain vaiheessa. (P4)

## backend + frontend

- **Uniikki väri/symboli/nimi**: Pelaajilla ei saa olla sama väri, symboli tai nimi. Backend hylkää päällekkäisyydet; frontend estää valinnan. Odotushuoneessa boteille generoidaan uudet arvot tarvittaessa kun uusi pelaaja liittyy. (P2)
- **Botin failsafe**: Jos botin vuoro jää jumiin, automaattinen palautus + lokimerkintä. (P2)
- **"Kerää kaikilta" -kortti**: Per-pelaaja velkaLogiikka — vuoro ei saa vaihtua ennen kuin kaikki pelaajat ovat maksaneet tai menneet konkurssiin. (P3)

## kehitystyökalut
- pystytä axiom mcp
- vieläkin pelaajien napit jää esim kiinteistön omistuksen väriviivan alle.

## validoi / testaa

- **Siirry lähimmälle laitokselle -kortti**: Tarkista miten tämän kuuluisi toimia ja validoi toteutus.
- zoomi menee hyvvin nyt nopat -> pelaaja ja sit pelaaja liikkuu. mutta se käy tos liikkumisen alkamisen jälkeen jossain nykäsemässä ja palaa sit takasin? mikä ihmeen nykäsy tää on. vai onko pelaajan liikkelle lähdön ja joku zoomin ajoitus pielessä? taitaa riittää et heitetään noppaa -> viive x -> sit lähdetään seuraan pelaajaa ja kun on päädytty pelaajalle niin seurataan sitävaan kunnes liike pysähtyy. ja joku muu viive huolehtii sen et nopanheiton jälkeen on x viive enenku pelaaja lähtee liikkeelle.... tää on nyut jotenkin liianvaikee saada iokein tämä rytmi.
