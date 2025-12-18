/**
 * Tester for Rakettsensorer extension
 * Tests for Rakettsensorer extension
 */

// Test ADXL375 akselerometer
let xAccel = rakettsensorer.lesXAkselerasjon(rakettsensorer.AkselerasjonEnhet.G)
let yAccel = rakettsensorer.lesYAkselerasjon(rakettsensorer.AkselerasjonEnhet.G)
let zAccel = rakettsensorer.lesZAkselerasjon(rakettsensorer.AkselerasjonEnhet.G)
let totalAccel = rakettsensorer.lesTotalAkselerasjon(rakettsensorer.AkselerasjonEnhet.MS2)

// Test BMP280 sensor
let temp = rakettsensorer.lesTemperatur(rakettsensorer.TemperaturEnhet.Celsius)
let press = rakettsensorer.lesLufttrykk(rakettsensorer.TrykkEnhet.hPa)
let altitude = rakettsensorer.beregnHoyde(101325)

// Test avanserte funksjoner
rakettsensorer.aktiverAktivitetsdeteksjon(10)
rakettsensorer.aktiverFrittfallsdeteksjon(2, 100)
let isActive = rakettsensorer.interruptAktiv(rakettsensorer.InterruptType.Aktivitet)
