# todo

## testit

## backend + frontend

- **"Kerää kaikilta" -kortti**: Per-pelaaja velkaLogiikka — vuoro ei saa vaihtua ennen kuin kaikki pelaajat ovat maksaneet tai menneet konkurssiin. (P3)

## backend

### bottiparannukset

Bot-parannuksia mietittäväksi — tehdään myöhemmin kun priorisoidaan:

**Strateginen reagointi muiden tilanteeseen**
- [ ] **Rakennusten ajoitus**: priorisoi ryhmät joihin vastustaja on 1–7 askeleen päässä — rakenna ennen kuin he saapuvat, ei milloin sattuu
- [ ] **Vankila-strategia**: jos vastustajilla on hotelleja, pysy vankilassa pidempään (älä maksa ulos). Jos omat korkeatuottoiset kohteet ovat vastustajan lähellä, maksa ulos heti.
- [ ] **Huutokauppa-blokkaus**: jos vastustajalla on n-1/n saman ryhmän omaisuuksista, tarjoa aggressiivisemmin estääksesi monopolin syntymisen — ei pelkästään omavaraisuuden takia
- [ ] **Älä auta voittajaa**: älä tee kauppaa pelaajan kanssa jolla on korkein nettovarallisuus tai joka on lähellä monopolia, vaikka omista intresseistä se näyttäisi järkevältä
- [ ] **Kassakäyttäytyminen oman vaarallisen alueen lähestyessä**: boardDangerScore on globaali — lisää paikallinen tarkistus: jos botti itse on 3–8 askeleen päässä vastustajan hotellista, ei rakenneta tai käytetä käteistä

**Loppupeli ja asema-tietoisuus**
- [ ] **Asema-tietoinen strategia**: jos botti on häviämässä (alin nettovarallisuus), ota enemmän riskejä (hyväksy huonompia kauppoja, rakenna aggressiivisemmin). Jos voittamassa, pelaa konservatiivisesti.
- [ ] **Panttilainauksen ajoitus**: unmortgage-päätöksessä ota huomioon onko vastustaja lähellä ko. omaisuutta — prioritisoi unmortgage kun vastustaja on tulossa

**Kaupankäynti**
- [ ] **Vastatarjouslogiikka**: tällä hetkellä botti voi counteroida max 2x. Paranna: counter-tarjouksen arvostus suhteessa omaan asemaan (etu vai tappio kaupasta pitkällä tähtäimellä)

## kehitystyökalut
- pystytä axiom mcp <- älä vielä tee

## muut, ei kategorisoitu vielä

