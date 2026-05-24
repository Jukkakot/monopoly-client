# todo

## bugit

- **Popup-ajoitus**: Popupit (vuokra, sattuma/yhteismaa, päätös) avautuvat ennen kuin pelimerkki on saapunut ruutuun — pitää odottaa animaation loppua. (P2)
- **"Astu 3 taaksepäin" -animaatio**: Pitää animoida oikeasti 3 askelta taaksepäin, ei ympäri koko lautaa. (P3)

## frontend / UI

- **Backend-lataus etusivulla**: Backend sammuu käyttämättömänä ja käynnistys kestää ~50s. Etusivulle selkeä indikaattori yhteyden muodostumisesta (spinner tms. kun /health tai sessions-haku on kesken). (P2)
- **Mobiili — pelaajien rahat**: Rahamäärät näkyviin tiiviisti toimintopaneelin yhteydessä ilman tab-vaihtoa. (P2)
- **Talon hinta kaikkialle**: Talon osto/myyntihinta näkyviin kaikkialle missä relevanttia: rakentaminen, myynti, kiinteistödetaili-paneeli. (P2)
- **Velan maksu — nappuloiden väri**: Koko nappula kiinteistön värinen (ei vain sivuraita). Tiivistä nappuloita — useampi per rivi jos mahtuu. (P3)
- **Ilmoitusasetukset**: Mahdollisuus säätää mitkä ruutunotifikaatiot näkyvät. (P4)

## backend + frontend

- **Pelaajan poistuminen**: LeaveGame-komento + ilmoitus muille pelaajille pelin aikana. Nyt poistuminen on hiljaa eikä muut tiedä. (P2)
- **Uniikki väri/symboli/nimi**: Pelaajilla ei saa olla sama väri, symboli tai nimi. Backend hylkää päällekkäisyydet; frontend estää valinnan. Odotushuoneessa boteille generoidaan uudet arvot tarvittaessa kun uusi pelaaja liittyy. (P2)
- **Botin failsafe**: Jos botin vuoro jää jumiin, automaattinen palautus + lokimerkintä. (P2)
- **"Kerää kaikilta" -kortti**: Per-pelaaja velkaLogiikka — vuoro ei saa vaihtua ennen kuin kaikki pelaajat ovat maksaneet tai menneet konkurssiin. (P3)

## validoi / testaa

- **Bottien kortit**: Sama popup ActionPanelissa ilman OK-nappia, häviää automaattisesti botin kuitattua. Validoi ennen poistamista.



## muut (ei vielä kategorisoitu)
- consolessa on paljon erilaisia virheitä kun käynnistetään.......
- verkko latenssi vois näkyäm UI:lla ainakin "debug" tilassa.
- auditlokitus bäkkärin kutsuille/vastauksille joskus toteutettava.
-  backendis on rikkinäisiä testejä, korjaa ne ja pidä huoli et kaikki testit ajetaan aina ennen commit et ei vietäis rikkinäsitä koodia tuotantoon. tai voisko deploy-prosessin tehdä sellaseks et deploy failaa jos testit ei mee läpi...
- serverin lähettämä aikaleima pitäs olla se aikaleima mikä laietaan just ennen kun snapshot lähetetään clientille. Nyt se taitaa sisältää jotain muutakin aikaa? Vai osaako frontti laskea delayn oikein?

- openapi taitaa väittää et session id on uuid? ei enää ole.
- backend pitää palauttaa virhettä jos annetaan ei validia dataa inputtina. esim settings endpoint sallii nyt asetuksia mitkä eivät ole tuettu.
- notifikaatioiden kans pitää ratkasta jotenkin paremmin kun niitä tulee paljon: ![alt text](image.png) EHkä "sinun vuorosi" notifikaation vois oletuksena poistaa käytöstä.
- oiskohan fronttiin jotain kirjastoa millä tehdä bäkkärin kutsut helpoimmaks?
- huutokauppaa pitäs selkeyttää et mitä mikäkin tarkoittaa...
- huutokaupassa vois olla "all in" vai onko hyvä idea?
- pelaajien nappi pitäs olla aina päällimmäisenä pelilaualla., nyt ainakin kiinnityksen ruksi menee pelaajan päälle.
- talon rakennus ei saa näkyä jos yksikään kiinteistöistä on kiinnitettynä.
- pelaajakorteissa pitäs olla vaikka yliviivattuna kiinnitetyt kiinteistöt ja muuallakin pelissä missä kiinteistöjä näytetään (paitsi se näkymä missä kiinteistöjä pantataan/avataan.)
- siirry lähimmälle laitokselle kortti -> tarkista miten ton kuuluis toimia? 
- Sen ihmisen pelaajan kuka pelaa kiinteistöt vois näkyä vaiks pelilaudalla tähän tyyliin: eli kiinteistöt ryhmiteltynä per väri. kiinnitys status näkyy ruksilla. hotellit ja talot näkyy kiinteistön päällä jos on rakennuksia. ![alt text](image-1.png)
- kaupan käynnissä kiinteistön arvo vois näkyä vaikka se on pantattu.
- globaaliin ohjeeseen vois lisätä et pidä huoli että uusikin pelaaja tietää mitä mistäkin tapahtuu.
- odotushuoneeseen liittyessä pitäs olla mahdollista valita sun logot sun muut. tää ehkä olikin jo todo-listalla.
- sattuma / yhteismaa korteissa puhutaan vielä oikeista monopolyn kiinteistöistä kuten "mene broadwaylle" -> nää pitäs kaikki vaihtaa nyt oikeiden kiinteistöjen nimiksi tässä pelissä.
- "Sinun vuorosi" ilmoituksia tuntuu tulevan liian usein? tarkista milloiin niitä näytetään. se pitäisi näkyä vaan kun vuoro oikeasti vaihtuu "minulle".
- tarkista voiko bäkkärissä tapahtuu sellasta, että pelaaja koittaa ostaa kiinteistön x, mutta ei ole rahaa- Mut kiinteistö tulee ostetuksi silti? ja näis tilanteissa bäkkärin siis pitäs vaan palauttaa joku virhe. Olis ehkä hyödyllistä palauttaa joku tietty virhekoodi näis tilanteis et frontti tietää miksi ei onnistunut. Vaikka tottakai frontti vois tän laskee kans ja paremmin indikoida et ostaminen ei onnnistu koska rahaa ei ole tarpeeksi.
- Ja kiinteistön ostoon liittyen, jos pelaaja koitta ostaa kiinteistön, mutta ei ole rahaa niin kiinteistön osto "moodi" pitäs kyllä säilyä mahdollisena. pelaajahan voi kiinnittää kiinteistöjä esim saadakseen rahaa. Tälllä hetkellä epäonnistunut osto aiheuttaa et pelin "moodi" siirtyy seuraavaan ja kiinteistöä ei voi enää ostaa.
- "kiinteistöt" välilehdellä lunasta/panttaa nappulat vois erottua jotenkin visualisesti vielä paremmin toisistaan. Nyt joutuu aika tarkaan lukemaan et kumpihan toiminto on kyseessä. ehkä vihree olis lunasta ja panttaa punainen?
- voiskohan frontissa käyttää jotain frameworrkia bäkkärin kutsuihin kuten axios tai jotain muuta? 


- yleinen havainto, mobiili ui tulee todennäköisesti olemaan se pää-käyttöliittymä tälle -> ui-n kehitystä mobiili-ystävälliseksi pitäisi korostaa ja pitää aina ui-muutoksissa mieleessä.