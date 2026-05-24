# todo

## bugit

- **Popup-ajoitus**: Popupit (vuokra, sattuma/yhteismaa, päätös) avautuvat ennen kuin pelimerkki on saapunut ruutuun — pitää odottaa animaation loppua. (P2)
- **"Astu 3 taaksepäin" -animaatio**: Pitää animoida oikeasti 3 askelta taaksepäin, ei ympäri koko lautaa. (P3)
- **"Sinun vuorosi" -ilmoitus liian usein**: Tarkista milloin näytetään — pitäisi näkyä vain kun vuoro oikeasti vaihtuu pelaajalle itselleen. (P2)
- **Kiinteistön osto epäonnistuu → ostomoodi katoaa**: Jos pelaajalla ei ole rahaa, osto hylätään mutta pelivaihe siirtyy eteenpäin. Ostomoodin pitäisi säilyä — pelaaja voi ensin kiinnittää kiinteistöjä saadakseen rahaa. (P2)
- **Talon rakennus näkyy vaikka kiinteistö kiinnitetty**: Rakennusnappi ei saa näkyä jos yksikin kiinteistö väriryhmässä on kiinnitetty. (P2)
- **Pelaajan nappi ei päällimmäisenä**: Pelaajien nappulat pitäisi olla aina päällimmäisenä pelilaudalla — nyt esim. kiinnityksen ruksi menee pelaajan päälle. (P3)
- **Console-virheitä käynnistyksessä**: Konsolissa on useita virheitä sovelluksen käynnistyessä — selvitä ja korjaa. (P3)

## frontend / UI

- **Backend-lataus etusivulla**: Backend sammuu käyttämättömänä ja käynnistys kestää ~50s. Etusivulle selkeä indikaattori yhteyden muodostumisesta (spinner tms. kun /health tai sessions-haku on kesken). (P2)
- **Mobiili — pelaajien rahat**: Rahamäärät näkyviin tiiviisti toimintopaneelin yhteydessä ilman tab-vaihtoa. (P2)
- **Talon hinta kaikkialle**: Talon osto/myyntihinta näkyviin kaikkialle missä relevanttia: rakentaminen, myynti, kiinteistödetaili-paneeli. (P2)
- **Velan maksu — nappuloiden väri**: Koko nappula kiinteistön värinen (ei vain sivuraita). Tiivistä nappuloita — useampi per rivi jos mahtuu. (P3)
- **Notifikaatioiden hallinta**: Ratkaise miten toimitaan kun notifikaatioita tulee paljon. "Sinun vuorosi" -notifikaatio oletuksena pois päältä. (P3)
- **Huutokaupan UI**: Selkeytä mitä mikäkin elementti tarkoittaa. Harkitse "all in" -nappia. (P3)
- **Kiinnitetyt kiinteistöt yliviivattuina**: Pelaajakorteissa ja muualla missä kiinteistöjä listataan (paitsi panttaus/lunastus-näkymässä) kiinnitetyt näkyvät yliviivattuina. (P3)
- **Kiinteistöt pelilaudalla väriryhmittäin**: Ihmispelaajan omistamat kiinteistöt näkyvät laudalla ryhmiteltynä värin mukaan — kiinnitystila ruksilla, talot/hotelli kiinteistön päällä. (P4)
- **Kiinteistön arvo kaupassa pantattunakin**: Kaupankäyntinäkymässä kiinteistön arvo näkyy vaikka se on pantattu. (P3)
- **Odotushuone — logon valinta**: Liittyessä pitäisi voida valita token, väri ja nimi. (P3)
- **Lunasta/panttaa — visuaalinen erottelu**: "Kiinteistöt"-välilehdellä lunasta- ja panttaa-napit erottuvat selkeämmin — esim. lunasta vihreä, panttaa punainen. (P3)
- **Verkkolatenssi debug-tilassa**: Verkkolatenssi näkyviin UI:lla debug-modessa. (P4)
- **Ilmoitusasetukset**: Mahdollisuus säätää mitkä ruutunotifikaatiot näkyvät. (P4)
- **HTTP-kirjasto backend-kutsuihin**: Harkitse axios tai vastaava kirjasto `fetch`-kutsujen sijaan — helpottaisi virheiden käsittelyä ja tyypitystä. (P4)

## backend

- **Input-validointi**: Backend palauttaa virheen jos syöte ei ole validi — esim. settings-endpoint hyväksyy nyt tukemattomia arvoja. (P2)
- **OpenAPI: session id ei ole UUID**: OpenAPI-spec väittää session id:n olevan UUID, mutta se ei enää ole. Korjaa schema. (P3)
- **Audit-lokitus**: Bäkkärin HTTP-kutsuille ja vastauksille audit-loki jossain vaiheessa. (P4)

## backend + frontend

- **Pelaajan poistuminen**: LeaveGame-komento + ilmoitus muille pelaajille pelin aikana. Nyt poistuminen on hiljaa eikä muut tiedä. (P2)
- **Uniikki väri/symboli/nimi**: Pelaajilla ei saa olla sama väri, symboli tai nimi. Backend hylkää päällekkäisyydet; frontend estää valinnan. Odotushuoneessa boteille generoidaan uudet arvot tarvittaessa kun uusi pelaaja liittyy. (P2)
- **Botin failsafe**: Jos botin vuoro jää jumiin, automaattinen palautus + lokimerkintä. (P2)
- **Kiinteistön osto ilman rahaa — virhekoodi**: Tarkista voiko kiinteistön ostaa vaikka rahaa ei ole. Backend palauttaa selkeän virhekoodin jotta frontend voi näyttää syyn (ei rahaa). (P2)
- **Korttitekstit → Helsinki-nimet**: Sattuma/yhteismaa-korteissa viitataan Monopolyn alkuperäisiin kiinteistöihin ("mene Broadwaylle" tms.). Kaikki pitää vaihtaa tämän pelin Helsinki-kiinteistöjen nimiksi. (P3)
- **"Kerää kaikilta" -kortti**: Per-pelaaja velkaLogiikka — vuoro ei saa vaihtua ennen kuin kaikki pelaajat ovat maksaneet tai menneet konkurssiin. (P3)

## validoi / testaa

- **Bottien kortit**: Sama popup ActionPanelissa ilman OK-nappia, häviää automaattisesti botin kuitattua. Validoi ennen poistamista.
- **Siirry lähimmälle laitokselle -kortti**: Tarkista miten tämän kuuluisi toimia ja validoi toteutus.
- **Backend-testit**: Rikkinäisiä testejä — korjaa ja varmista että kaikki testit ajetaan ennen commitia. Harkitse CI-pipeline joka hylkää deployn jos testit eivät mene läpi.

## muut (ei vielä kategorisoitu)
