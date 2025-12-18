# Rakettsensorer 🚀

MakeCode extension for Adafruit ADXL375 (høy-g akselerometer) og BMP280 (temperatur & trykk) sensorer for micro:bit rakettprosjekter.

> MakeCode extension for Adafruit ADXL375 (high-g accelerometer) and BMP280 (temperature & pressure) sensors for micro:bit rocket projects.

## Funksjoner / Features

### ADXL375 - Høy-g Akselerometer / High-g Accelerometer

**ADXL375** er et 3-akset akselerometer som kan måle opp til ±200g akselerasjon - perfekt for raketter!

The **ADXL375** is a 3-axis accelerometer that can measure up to ±200g acceleration - perfect for rockets!

#### Grunnleggende funksjoner / Basic Functions

- **Les X/Y/Z akselerasjon** - Les akselerasjon på individuelle akser
  - Velg mellom **g-kraft** eller **m/s²**
  - Read acceleration on individual axes
  - Choose between **g-force** or **m/s²**

- **Les total akselerasjon** - Beregner vektorsum av alle tre akser
  - Total akselerasjon = √(X² + Y² + Z²)
  - Calculates vector sum of all three axes

#### Avanserte funksjoner / Advanced Functions

- **Aktivitetsdeteksjon** - Oppdager når raketten beveger seg
  - Activity detection - Detects when rocket is moving

- **Inaktivitetsdeteksjon** - Oppdager når raketten er i ro
  - Inactivity detection - Detects when rocket is stationary

- **Frittfallsdeteksjon** - Oppdager fritt fall
  - Freefall detection - Detects free fall

- **Tap-deteksjon** - Oppdager enkelt eller dobbelt tap/støt
  - Tap detection - Detects single or double tap/impact

- **Data klar interrupt** - Varsler når nye data er tilgjengelig
  - Data ready interrupt - Signals when new data is available

### BMP280 - Temperatur og Lufttrykk / Temperature and Pressure

**BMP280** måler temperatur og barometrisk trykk, som kan brukes til å beregne høyde.

The **BMP280** measures temperature and barometric pressure, which can be used to calculate altitude.

#### Funksjoner / Functions

- **Les temperatur** - Måler temperatur
  - Velg mellom **Celsius (°C)** eller **Fahrenheit (°F)**
  - Choose between **Celsius (°C)** or **Fahrenheit (°F)**

- **Les lufttrykk** - Måler barometrisk trykk
  - Velg mellom **Pascal (Pa)** eller **Hectopascal (hPa)**
  - Choose between **Pascal (Pa)** or **Hectopascal (hPa)**

- **Beregn høyde** - Beregner høyde basert på lufttrykk
  - Krever havnivåtrykk som referanse (standard: 101325 Pa)
  - Calculates altitude based on air pressure
  - Requires sea level pressure as reference (default: 101325 Pa)

## Tilkobling / Wiring

### ADXL375

| ADXL375 | micro:bit |
|---------|-----------|
| VIN     | 3V        |
| GND     | GND       |
| SCL     | Pin 19 (SCL) |
| SDA     | Pin 20 (SDA) |

**I2C-adresse / I2C Address:**
- 0x53 (standard/default)
- 0x1D (hvis ALT ADDRESS er koblet til VDD / if ALT ADDRESS is connected to VDD)

### BMP280

| BMP280  | micro:bit |
|---------|-----------|
| VIN     | 3V        |
| GND     | GND       |
| SCL     | Pin 19 (SCL) |
| SDA     | Pin 20 (SDA) |

**I2C-adresse / I2C Address:**
- 0x77 (standard/default)
- 0x76 (alternativ / alternative)

> **Merk / Note:** Extension detekterer automatisk I2C-adressen! / The extension automatically detects the I2C address!

## Eksempler / Examples

### Eksempel 1: Grunnleggende rakettdata / Basic Rocket Data

```typescript
basic.forever(function () {
    // Les akselerasjon i g-kraft
    serial.writeValue("Akselerasjon", rakettsensorer.lesTotalAkselerasjon(AkselerasjonEnhet.G))

    // Les høyde
    serial.writeValue("Høyde", rakettsensorer.beregnHoyde(101325))

    // Les temperatur
    serial.writeValue("Temp", rakettsensorer.lesTemperatur(TemperaturEnhet.Celsius))

    basic.pause(100)
})
```

### Eksempel 2: Oppskytningsdeteksjon / Launch Detection

```typescript
// Aktiver aktivitetsdeteksjon med 10g terskel
rakettsensorer.aktiverAktivitetsdeteksjon(10)

basic.forever(function () {
    if (rakettsensorer.interruptAktiv(InterruptType.Aktivitet)) {
        basic.showIcon(IconNames.Yes)
        // Rakett oppskytning oppdaget!
        // Rocket launch detected!
    }
})
```

### Eksempel 3: Maksimal akselerasjon / Maximum Acceleration

```typescript
let maksAkselerasjon = 0

basic.forever(function () {
    let akselerasjon = rakettsensorer.lesTotalAkselerasjon(AkselerasjonEnhet.G)

    if (akselerasjon > maksAkselerasjon) {
        maksAkselerasjon = akselerasjon
        serial.writeValue("Max g", maksAkselerasjon)
    }

    basic.pause(10)
})
```

### Eksempel 4: Apogeum-deteksjon (høyeste punkt) / Apogee Detection

```typescript
let forrigeHoyde = 0
let apogeum = false

basic.forever(function () {
    let hoyde = rakettsensorer.beregnHoyde(101325)

    // Hvis høyden begynner å synke, har vi nådd apogeum
    if (hoyde < forrigeHoyde && !apogeum) {
        apogeum = true
        basic.showIcon(IconNames.Target)
        serial.writeLine("Apogeum nådd!")
    }

    forrigeHoyde = hoyde
    basic.pause(100)
})
```

## Tekniske detaljer / Technical Details

### ADXL375
- **Måleområde / Measurement Range:** ±200g
- **Oppløsning / Resolution:** 49 mg/LSB
- **I2C-hastighet / I2C Speed:** Standard (100 kHz) og Fast (400 kHz)
- **Datarate:** Konfigurerbar, standard 100 Hz
- **Strømforbruk / Power Consumption:** ~140 µA ved 100 Hz

### BMP280
- **Trykkområde / Pressure Range:** 300-1100 hPa
- **Temperaturområde / Temperature Range:** -40°C til +85°C
- **Nøyaktighet trykk / Pressure Accuracy:** ±1 hPa
- **Nøyaktighet temperatur / Temperature Accuracy:** ±1°C
- **Høydenøyaktighet / Altitude Accuracy:** ±1 meter
- **Strømforbruk / Power Consumption:** ~2.7 µA ved 1 Hz

## Lisens / License

MIT

## Støttede målplattformer / Supported Targets

- micro:bit
- micro:bit V2

## Ressurser / Resources

### ADXL375
- [Adafruit ADXL375 Datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/ADXL375.PDF)
- [Adafruit CircuitPython ADXL37x Library](https://github.com/adafruit/Adafruit_CircuitPython_ADXL37x)

### BMP280
- [BMP280 Datasheet](https://cdn-shop.adafruit.com/datasheets/BST-BMP280-DS001-11.pdf)
- [Adafruit BMP280 Library](https://github.com/adafruit/Adafruit_BMP280_Library)

---

**Laget for rakettentusiaster! / Made for rocket enthusiasts!** 🚀
