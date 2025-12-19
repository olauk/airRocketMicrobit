/**
 * Rakettsensorer - MakeCode extension for Adafruit ADXL375 and BMP280 sensors
 *
 * ADXL375: High-g accelerometer (±200g) for rocket acceleration measurement
 * BMP280: Temperature and pressure sensor for altitude tracking
 */

//% weight=100 color=#ff6600 icon="\uf135" block="Rakettsensorer"
//% groups=['ADXL375', 'BMP280', 'Avansert']
namespace rakettsensorer {

    // ==================== ADXL375 Constants ====================
    const ADXL375_ADDR_PRIMARY = 0x53
    const ADXL375_ADDR_ALT = 0x1D

    // ADXL375 Registers
    const ADXL375_REG_DEVID = 0x00          // Device ID (should be 0xE5)
    const ADXL375_REG_THRESH_ACT = 0x24     // Activity threshold
    const ADXL375_REG_THRESH_INACT = 0x25   // Inactivity threshold
    const ADXL375_REG_TIME_INACT = 0x26     // Inactivity time
    const ADXL375_REG_ACT_INACT_CTL = 0x27  // Activity/Inactivity control
    const ADXL375_REG_THRESH_FF = 0x28      // Free-fall threshold
    const ADXL375_REG_TIME_FF = 0x29        // Free-fall time
    const ADXL375_REG_TAP_AXES = 0x2A       // Tap axes control
    const ADXL375_REG_TAP_THRESH = 0x1D     // Tap threshold
    const ADXL375_REG_DUR = 0x21            // Tap duration
    const ADXL375_REG_LATENT = 0x22         // Tap latency
    const ADXL375_REG_WINDOW = 0x23         // Tap window
    const ADXL375_REG_BW_RATE = 0x2C        // Data rate and power mode
    const ADXL375_REG_POWER_CTL = 0x2D      // Power control
    const ADXL375_REG_INT_ENABLE = 0x2E     // Interrupt enable
    const ADXL375_REG_INT_SOURCE = 0x30     // Interrupt source
    const ADXL375_REG_DATA_FORMAT = 0x31    // Data format
    const ADXL375_REG_DATAX0 = 0x32         // X-axis data LSB
    const ADXL375_REG_DATAY0 = 0x34         // Y-axis data LSB
    const ADXL375_REG_DATAZ0 = 0x36         // Z-axis data LSB

    // ADXL375 Scale factor: 49 mg/LSB (±200g range)
    const ADXL375_MG_LSB = 49.0
    const ADXL375_G_TO_MS2 = 9.80665

    // ==================== BMP280 Constants ====================
    const BMP280_ADDR_PRIMARY = 0x76
    const BMP280_ADDR_ALT = 0x77

    // BMP280 Registers
    const BMP280_REG_CHIP_ID = 0xD0
    const BMP280_REG_RESET = 0xE0
    const BMP280_REG_STATUS = 0xF3
    const BMP280_REG_CTRL_MEAS = 0xF4
    const BMP280_REG_CONFIG = 0xF5
    const BMP280_REG_PRESS_MSB = 0xF7
    const BMP280_REG_TEMP_MSB = 0xFA
    const BMP280_REG_CALIB_START = 0x88

    // BMP280 Chip ID
    const BMP280_CHIP_ID = 0x58

    // ==================== Global Variables ====================
    let adxl375Address = 0
    let bmp280Address = 0
    let bmp280Calibration: number[] = []
    let bmp280Initialized = false
    let adxl375Initialized = false

    // ==================== Helper Functions ====================

    /**
     * Write a byte to I2C device
     */
    function writeReg(addr: number, reg: number, value: number): void {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    /**
     * Read a byte from I2C device
     */
    function readReg(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE)
        return pins.i2cReadNumber(addr, NumberFormat.UInt8BE)
    }

    /**
     * Read 16-bit signed value (little endian)
     */
    function readReg16LE(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE)
        let buf = pins.i2cReadBuffer(addr, 2)
        return buf[0] | (buf[1] << 8)
    }

    /**
     * Read 16-bit unsigned value (little endian)
     */
    function readReg16ULE(addr: number, reg: number): number {
        let val = readReg16LE(addr, reg)
        if (val < 0) val += 65536
        return val
    }

    /**
     * Convert signed 16-bit to proper value
     */
    function int16(val: number): number {
        if (val > 32767) return val - 65536
        return val
    }

    // ==================== ADXL375 Functions ====================

    /**
     * Detect and initialize ADXL375 accelerometer
     */
    function initADXL375(): boolean {
        if (adxl375Initialized) return true

        // Try primary address
        try {
            let devid = readReg(ADXL375_ADDR_PRIMARY, ADXL375_REG_DEVID)
            if (devid == 0xE5) {
                adxl375Address = ADXL375_ADDR_PRIMARY
                configureADXL375()
                adxl375Initialized = true
                return true
            }
        } catch (e) { }

        // Try alternate address
        try {
            let devid = readReg(ADXL375_ADDR_ALT, ADXL375_REG_DEVID)
            if (devid == 0xE5) {
                adxl375Address = ADXL375_ADDR_ALT
                configureADXL375()
                adxl375Initialized = true
                return true
            }
        } catch (e) { }

        return false
    }

    /**
     * Configure ADXL375 with default settings
     */
    function configureADXL375(): void {
        // Set data format: full resolution, ±200g range
        writeReg(adxl375Address, ADXL375_REG_DATA_FORMAT, 0x0B)
        // Set data rate to 100 Hz
        writeReg(adxl375Address, ADXL375_REG_BW_RATE, 0x0A)
        // Enable measurement mode
        writeReg(adxl375Address, ADXL375_REG_POWER_CTL, 0x08)
        basic.pause(10)
    }

    /**
     * Read raw acceleration data from ADXL375
     */
    function readAccelRaw(): number[] {
        if (!initADXL375()) return [0, 0, 0]

        let x = int16(readReg16LE(adxl375Address, ADXL375_REG_DATAX0))
        let y = int16(readReg16LE(adxl375Address, ADXL375_REG_DATAY0))
        let z = int16(readReg16LE(adxl375Address, ADXL375_REG_DATAZ0))

        return [x, y, z]
    }

    /**
     * Convert raw value to g-force
     */
    function rawToG(raw: number): number {
        return (raw * ADXL375_MG_LSB) / 1000.0
    }

    /**
     * Convert raw value to m/s²
     */
    function rawToMS2(raw: number): number {
        return rawToG(raw) * ADXL375_G_TO_MS2
    }

    /**
     * Les akselerasjon på X-aksen
     */
    //% block="les X akselerasjon i $enhet"
    //% group="ADXL375"
    //% weight=100
    export function lesXAkselerasjon(enhet: AkselerasjonEnhet): number {
        let raw = readAccelRaw()
        if (enhet == AkselerasjonEnhet.G) {
            return Math.round(rawToG(raw[0]) * 100) / 100
        } else {
            return Math.round(rawToMS2(raw[0]) * 100) / 100
        }
    }

    /**
     * Les akselerasjon på Y-aksen
     */
    //% block="les Y akselerasjon i $enhet"
    //% group="ADXL375"
    //% weight=99
    export function lesYAkselerasjon(enhet: AkselerasjonEnhet): number {
        let raw = readAccelRaw()
        if (enhet == AkselerasjonEnhet.G) {
            return Math.round(rawToG(raw[1]) * 100) / 100
        } else {
            return Math.round(rawToMS2(raw[1]) * 100) / 100
        }
    }

    /**
     * Les akselerasjon på Z-aksen
     */
    //% block="les Z akselerasjon i $enhet"
    //% group="ADXL375"
    //% weight=98
    export function lesZAkselerasjon(enhet: AkselerasjonEnhet): number {
        let raw = readAccelRaw()
        if (enhet == AkselerasjonEnhet.G) {
            return Math.round(rawToG(raw[2]) * 100) / 100
        } else {
            return Math.round(rawToMS2(raw[2]) * 100) / 100
        }
    }

    /**
     * Les total akselerasjon (vektorsum av alle akser)
     */
    //% block="les total akselerasjon i $enhet"
    //% group="ADXL375"
    //% weight=97
    export function lesTotalAkselerasjon(enhet: AkselerasjonEnhet): number {
        let raw = readAccelRaw()
        let totalRaw = Math.sqrt(raw[0] * raw[0] + raw[1] * raw[1] + raw[2] * raw[2])

        if (enhet == AkselerasjonEnhet.G) {
            return Math.round(rawToG(totalRaw) * 100) / 100
        } else {
            return Math.round(rawToMS2(totalRaw) * 100) / 100
        }
    }
    //% block="les RAW Z akselerasjon"
    export function debugRawZ(): number {
        let raw = readAccelRaw()
        return raw[2]  // Return raw Z value
    }

    // ==================== DEBUG Functions ====================

    /**
     * Les RAW akselerasjonsverdier for debugging
     */
    //% block="les RAW Z akselerasjon"
    //% group="Avansert"
    //% weight=45
    //% advanced=true
    export function lesRawZAkselerasjon(): number {
        let raw = readAccelRaw()
        return raw[2]
    }

    /**
     * Les DATA_FORMAT register for debugging
     */
    //% block="les DATA FORMAT register"
    //% group="Avansert"
    //% weight=44
    //% advanced=true
    export function lesDataFormatRegister(): number {
        if (!initADXL375()) return 0
        return readReg(adxl375Address, ADXL375_REG_DATA_FORMAT)
    }

    /**
     * Les POWER_CTL register for debugging
     */
    //% block="les POWER CTL register"
    //% group="Avansert"
    //% weight=43
    //% advanced=true
    export function lesPowerCtlRegister(): number {
        if (!initADXL375()) return 0
        return readReg(adxl375Address, ADXL375_REG_POWER_CTL)
    }

    /**
     * Les X-akse offset register
     */
    //% block="les X offset register"
    //% group="Avansert"
    //% weight=42
    //% advanced=true
    export function lesXOffsetRegister(): number {
        if (!initADXL375()) return 0
        let val = readReg(adxl375Address, ADXL375_REG_OFSX)
        // Convert to signed 8-bit
        if (val > 127) return val - 256
        return val
    }

    /**
     * Les Y-akse offset register
     */
    //% block="les Y offset register"
    //% group="Avansert"
    //% weight=41
    //% advanced=true
    export function lesYOffsetRegister(): number {
        if (!initADXL375()) return 0
        let val = readReg(adxl375Address, ADXL375_REG_OFSY)
        // Convert to signed 8-bit
        if (val > 127) return val - 256
        return val
    }

    /**
     * Les Z-akse offset register
     */
    //% block="les Z offset register"
    //% group="Avansert"
    //% weight=40
    //% advanced=true
    export function lesZOffsetRegister(): number {
        if (!initADXL375()) return 0
        let val = readReg(adxl375Address, ADXL375_REG_OFSZ)
        // Convert to signed 8-bit
        if (val > 127) return val - 256
        return val
    }

    // ==================== ADXL375 Interrupt Functions (Advanced) ====================

    /**
     * Sett opp aktivitetsdeteksjon (bevegelse)
     */
    //% block="aktiver aktivitetsdeteksjon terskel $terskel g"
    //% group="Avansert"
    //% weight=50
    //% terskel.min=0 terskel.max=200 terskel.defl=10
    export function aktiverAktivitetsdeteksjon(terskel: number): void {
        if (!initADXL375()) return

        // Threshold is in units of 49mg per LSB
        let threshold = Math.floor(terskel * 1000 / ADXL375_MG_LSB)
        writeReg(adxl375Address, ADXL375_REG_THRESH_ACT, threshold)

        // Enable AC-coupled activity detection on all axes
        writeReg(adxl375Address, ADXL375_REG_ACT_INACT_CTL, 0x77)

        // Enable activity interrupt
        let intEnable = readReg(adxl375Address, ADXL375_REG_INT_ENABLE)
        writeReg(adxl375Address, ADXL375_REG_INT_ENABLE, intEnable | 0x10)
    }

    /**
     * Sett opp inaktivitetsdeteksjon (stillstand)
     */
    //% block="aktiver inaktivitetsdeteksjon terskel $terskel g tid $tid sekunder"
    //% group="Avansert"
    //% weight=49
    //% terskel.min=0 terskel.max=200 terskel.defl=5
    //% tid.min=1 tid.max=255 tid.defl=5
    export function aktiverInaktivitetsdeteksjon(terskel: number, tid: number): void {
        if (!initADXL375()) return

        // Threshold is in units of 49mg per LSB
        let threshold = Math.floor(terskel * 1000 / ADXL375_MG_LSB)
        writeReg(adxl375Address, ADXL375_REG_THRESH_INACT, threshold)

        // Time is in seconds
        writeReg(adxl375Address, ADXL375_REG_TIME_INACT, tid)

        // Enable AC-coupled inactivity detection on all axes
        writeReg(adxl375Address, ADXL375_REG_ACT_INACT_CTL, 0x77)

        // Enable inactivity interrupt
        let intEnable = readReg(adxl375Address, ADXL375_REG_INT_ENABLE)
        writeReg(adxl375Address, ADXL375_REG_INT_ENABLE, intEnable | 0x08)
    }

    /**
     * Sett opp frittfallsdeteksjon
     */
    //% block="aktiver frittfallsdeteksjon terskel $terskel g tid $tid ms"
    //% group="Avansert"
    //% weight=48
    //% terskel.min=0 terskel.max=20 terskel.defl=2
    //% tid.min=5 tid.max=1275 tid.defl=100
    export function aktiverFrittfallsdeteksjon(terskel: number, tid: number): void {
        if (!initADXL375()) return

        // Threshold is in units of 49mg per LSB
        let threshold = Math.floor(terskel * 1000 / ADXL375_MG_LSB)
        writeReg(adxl375Address, ADXL375_REG_THRESH_FF, threshold)

        // Time is in units of 5ms per LSB
        let timeVal = Math.floor(tid / 5)
        writeReg(adxl375Address, ADXL375_REG_TIME_FF, timeVal)

        // Enable free fall interrupt
        let intEnable = readReg(adxl375Address, ADXL375_REG_INT_ENABLE)
        writeReg(adxl375Address, ADXL375_REG_INT_ENABLE, intEnable | 0x04)
    }

    /**
     * Sett opp tap-deteksjon (enkelt/dobbelt trykk)
     */
    //% block="aktiver tap-deteksjon terskel $terskel g"
    //% group="Avansert"
    //% weight=47
    //% terskel.min=0 terskel.max=200 terskel.defl=50
    export function aktiverTapDeteksjon(terskel: number): void {
        if (!initADXL375()) return

        // Threshold is in units of 49mg per LSB
        let threshold = Math.floor(terskel * 1000 / ADXL375_MG_LSB)
        writeReg(adxl375Address, ADXL375_REG_TAP_THRESH, threshold)

        // Set tap duration to 625 µs/LSB, default ~10ms
        writeReg(adxl375Address, ADXL375_REG_DUR, 0x10)

        // Set latent time for double tap to 1.25 ms/LSB, default ~100ms
        writeReg(adxl375Address, ADXL375_REG_LATENT, 0x50)

        // Set window time for second tap, 1.25 ms/LSB, default ~250ms
        writeReg(adxl375Address, ADXL375_REG_WINDOW, 0xFF)

        // Enable tap detection on all axes
        writeReg(adxl375Address, ADXL375_REG_TAP_AXES, 0x07)

        // Enable single and double tap interrupts
        let intEnable = readReg(adxl375Address, ADXL375_REG_INT_ENABLE)
        writeReg(adxl375Address, ADXL375_REG_INT_ENABLE, intEnable | 0x60)
    }

    /**
     * Sjekk om en interrupt har skjedd
     */
    //% block="interrupt aktiv $type"
    //% group="Avansert"
    //% weight=46
    export function interruptAktiv(type: InterruptType): boolean {
        if (!initADXL375()) return false

        let source = readReg(adxl375Address, ADXL375_REG_INT_SOURCE)

        switch (type) {
            case InterruptType.Aktivitet:
                return (source & 0x10) != 0
            case InterruptType.Inaktivitet:
                return (source & 0x08) != 0
            case InterruptType.Frittfall:
                return (source & 0x04) != 0
            case InterruptType.EnkeltTap:
                return (source & 0x40) != 0
            case InterruptType.DobbeltTap:
                return (source & 0x20) != 0
            case InterruptType.DataKlar:
                return (source & 0x80) != 0
            default:
                return false
        }
    }

    // ==================== BMP280 Functions ====================

    /**
     * Detect and initialize BMP280 sensor
     */
    function initBMP280(): boolean {
        if (bmp280Initialized) return true

        // Try primary address
        try {
            let chipId = readReg(BMP280_ADDR_PRIMARY, BMP280_REG_CHIP_ID)
            if (chipId == BMP280_CHIP_ID) {
                bmp280Address = BMP280_ADDR_PRIMARY
                configureBMP280()
                bmp280Initialized = true
                return true
            }
        } catch (e) { }

        // Try alternate address
        try {
            let chipId = readReg(BMP280_ADDR_ALT, BMP280_REG_CHIP_ID)
            if (chipId == BMP280_CHIP_ID) {
                bmp280Address = BMP280_ADDR_ALT
                configureBMP280()
                bmp280Initialized = true
                return true
            }
        } catch (e) { }

        return false
    }

    /**
     * Configure BMP280 and read calibration data
     */
    function configureBMP280(): void {
        // Read calibration data (24 bytes from 0x88)
        bmp280Calibration = []
        for (let i = 0; i < 24; i++) {
            bmp280Calibration.push(readReg(bmp280Address, BMP280_REG_CALIB_START + i))
        }

        // Configure: normal mode, temp oversampling x2, pressure oversampling x16
        writeReg(bmp280Address, BMP280_REG_CTRL_MEAS, 0x57)

        // Configure: standby 500ms, filter off
        writeReg(bmp280Address, BMP280_REG_CONFIG, 0xA0)

        basic.pause(10)
    }

    /**
     * Get calibration parameter
     */
    function getCalibParam16U(index: number): number {
        return bmp280Calibration[index] | (bmp280Calibration[index + 1] << 8)
    }

    function getCalibParam16S(index: number): number {
        let val = getCalibParam16U(index)
        if (val > 32767) val -= 65536
        return val
    }

    /**
     * Read raw temperature
     */
    function readTempRaw(): number {
        if (!initBMP280()) return 0

        let msb = readReg(bmp280Address, BMP280_REG_TEMP_MSB)
        let lsb = readReg(bmp280Address, BMP280_REG_TEMP_MSB + 1)
        let xlsb = readReg(bmp280Address, BMP280_REG_TEMP_MSB + 2)

        return (msb << 12) | (lsb << 4) | (xlsb >> 4)
    }

    /**
     * Read raw pressure
     */
    function readPressRaw(): number {
        if (!initBMP280()) return 0

        let msb = readReg(bmp280Address, BMP280_REG_PRESS_MSB)
        let lsb = readReg(bmp280Address, BMP280_REG_PRESS_MSB + 1)
        let xlsb = readReg(bmp280Address, BMP280_REG_PRESS_MSB + 2)

        return (msb << 12) | (lsb << 4) | (xlsb >> 4)
    }

    /**
     * Compensate temperature (returns in 0.01°C)
     * Also calculates t_fine needed for pressure compensation
     */
    let t_fine = 0
    function compensateTemp(adc_T: number): number {
        let dig_T1 = getCalibParam16U(0)
        let dig_T2 = getCalibParam16S(2)
        let dig_T3 = getCalibParam16S(4)

        let var1 = ((adc_T >> 3) - (dig_T1 << 1)) * dig_T2 >> 11
        let var2 = (((adc_T >> 4) - dig_T1) * ((adc_T >> 4) - dig_T1) >> 12) * dig_T3 >> 14

        t_fine = var1 + var2
        return (t_fine * 5 + 128) >> 8
    }

    /**
     * Compensate pressure (returns in Pa)
     * Requires t_fine from temperature compensation
     * Uses 32-bit floating point algorithm suitable for JavaScript
     */
    function compensatePress(adc_P: number): number {
        let dig_P1 = getCalibParam16U(6)
        let dig_P2 = getCalibParam16S(8)
        let dig_P3 = getCalibParam16S(10)
        let dig_P4 = getCalibParam16S(12)
        let dig_P5 = getCalibParam16S(14)
        let dig_P6 = getCalibParam16S(16)
        let dig_P7 = getCalibParam16S(18)
        let dig_P8 = getCalibParam16S(20)
        let dig_P9 = getCalibParam16S(22)

        // 32-bit floating point compensation algorithm
        let var1 = t_fine / 2.0 - 64000.0
        let var2 = var1 * var1 * dig_P6 / 32768.0
        var2 = var2 + var1 * dig_P5 * 2.0
        var2 = var2 / 4.0 + dig_P4 * 65536.0
        var1 = (dig_P3 * var1 * var1 / 524288.0 + dig_P2 * var1) / 524288.0
        var1 = (1.0 + var1 / 32768.0) * dig_P1

        if (var1 == 0) return 0

        let p = 1048576.0 - adc_P
        p = (p - var2 / 4096.0) * 6250.0 / var1
        var1 = dig_P9 * p * p / 2147483648.0
        var2 = p * dig_P8 / 32768.0
        p = p + (var1 + var2 + dig_P7) / 16.0

        return p
    }

    /**
     * Les temperatur
     */
    //% block="les temperatur i $enhet"
    //% group="BMP280"
    //% weight=90
    export function lesTemperatur(enhet: TemperaturEnhet): number {
        let rawTemp = readTempRaw()
        let tempC = compensateTemp(rawTemp) / 100.0

        if (enhet == TemperaturEnhet.Celsius) {
            return Math.round(tempC * 10) / 10
        } else {
            return Math.round((tempC * 9 / 5 + 32) * 10) / 10
        }
    }

    /**
     * Les lufttrykk
     */
    //% block="les lufttrykk i $enhet"
    //% group="BMP280"
    //% weight=89
    export function lesLufttrykk(enhet: TrykkEnhet): number {
        // Read temperature first to get t_fine
        let rawTemp = readTempRaw()
        compensateTemp(rawTemp)

        // Now read and compensate pressure
        let rawPress = readPressRaw()
        let pressPa = compensatePress(rawPress)

        if (enhet == TrykkEnhet.Pa) {
            return pressPa
        } else {
            return Math.round(pressPa / 100.0 * 10) / 10
        }
    }

    /**
     * Beregn høyde basert på lufttrykk
     */
    //% block="beregn høyde (meter) havnivåtrykk $seaLevelPa Pa"
    //% group="BMP280"
    //% weight=88
    //% seaLevelPa.defl=101325
    export function beregnHoyde(seaLevelPa: number): number {
        // Read temperature first to get t_fine
        let rawTemp = readTempRaw()
        compensateTemp(rawTemp)

        // Now read and compensate pressure
        let rawPress = readPressRaw()
        let pressPa = compensatePress(rawPress)

        // Barometric formula: h = 44330 * (1 - (p/p0)^(1/5.255))
        let altitude = 44330.0 * (1.0 - Math.pow(pressPa / seaLevelPa, 0.1903))

        return Math.round(altitude * 10) / 10
    }

    // ==================== Enums ====================

    export enum AkselerasjonEnhet {
        //% block="g"
        G = 0,
        //% block="m/s²"
        MS2 = 1
    }

    export enum TemperaturEnhet {
        //% block="°C"
        Celsius = 0,
        //% block="°F"
        Fahrenheit = 1
    }

    export enum TrykkEnhet {
        //% block="Pa"
        Pa = 0,
        //% block="hPa"
        hPa = 1
    }

    export enum InterruptType {
        //% block="aktivitet"
        Aktivitet = 0,
        //% block="inaktivitet"
        Inaktivitet = 1,
        //% block="frittfall"
        Frittfall = 2,
        //% block="enkelt tap"
        EnkeltTap = 3,
        //% block="dobbelt tap"
        DobbeltTap = 4,
        //% block="data klar"
        DataKlar = 5
    }
}
