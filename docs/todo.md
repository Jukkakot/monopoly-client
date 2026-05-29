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

## muut, ei kategorisoitu vielä

- Botti vois ottaa huomioon että se voi panttaa kiinteistöjä tai myydä taloja sun muuta et se saa rahaa jos se haluis kovasti jonkun kiinteistön. talojen myynti ei nyt koskaan ole kannattavaa tosin.
- tarkista talojen myyntihinnat, onko ne oikein?
- Velan maksamisessa näkyy kiinteistöt nyt hyvin. Ne pitää vielä vaan ryhmittää värin mukaan _> toteuta tää.
- toteuta kauppa-näkymään kiinteistöt saman näköisiksi kuin velan maksussa.
- kun mobiilin "raha palkissa" painaa pelaajaa, niin vois avvautua joku popup tiivvistelmä tästä pelaajasta. missä nyt näkyy just nimi, raha, kiinteistöt jne.
- odotushuone paranteluja tehtävä..


