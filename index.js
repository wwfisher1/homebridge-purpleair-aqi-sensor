"use strict"; 

var Service, Characteristic;
var request = require('request'); 

module.exports = function (homebridge) {
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;
        homebridge.registerAccessory("@wwfisher1/homebridge-purpleair-aqi-sensor", "PurpleAir", PurpleAirAccessory);
};


/**
 * PurpleAir Accessory
 */
function PurpleAirAccessory(log, config) {
        this.log = log;

        this.purpleID = config.purpleID;
        switch (config.adjust) {
                case 'NONE':
                case 'EPA':
                case 'LRAPA':
                case 'AQANDU':
                        this.adjust = config.adjust;
                        break;
                default:
                        this.adjust = 'NONE';
                        break;
        }
        switch (config.statsKey) {
                case 'v':
                case 'v1':
                case 'v2':
                case 'v3':
                case 'v4':
                case 'v5':
                case 'v6':
                        this.statsKey = config.statsKey;
                        break;
                default:
                        this.statsKey = 'v';
                        break;
        }
        this.lastupdate = 0;

        this.updateFreq = config.updateFreq;
        if (!this.updateFreq) {
                this.updateFreq = 90            // default 90 sec
        }
        this.updateMsecs = this.updateFreq * 1000;
        this.includePM10 = config.includePM10 || false;

        this.log.info("PurpleAir is working");

  this.localIP = config.localIP;
  this.adjustTempF = config.adjustTempF;
  this.adjustHum   = config.adjustHum;
  this.verboseLogging = config.verboseLogging;

        // Update the air data at the requested frequency.
        var self = this;
        setInterval(function () {
                self.getPurpleAirData();
        }, this.updateMsecs);
        this.getPurpleAirData();
}

PurpleAirAccessory.prototype = {
        /**
         * Get all Air data from PurpleAir
         */
        getPurpleAirData: function () {
                // Make request every updateFreq seconds (PurpleAir actual update frequency is around 40 seconds, but we really don't need that precision here}
                // this.log("getPurpleAirData called... lastupdate: %s, now: %s, freq: %s", this.lastupdate.toString(), timenow.toString(), this.updateMsecs.toString());
    var self = this;
    
    var url = 'https://www.purpleair.com/json?show=' + this.purpleID;
    if (this.localIP && this.localIP != '') {
      url = 'http://' + this.localIP + '/json';
    }

                request({
                        url: url,
                        json: true,
                }, function (err, response, data) {
                        // If no errors
                        if (!err && response.statusCode === 200) {
                                self.updateData(data);
                                // If error
                        }
                        else {
                                self.airQuality.updateCharacteristic(Characteristic.StatusFault, 1);
                                self.log.error("PurpleAir Network or Unknown Error.");
                        };
                });
        },

        /**
         * Update data
         */
        updateData: function (data) {
                this.airQuality.updateCharacteristic(Characteristic.StatusFault, 0);

                // PurpleAir outdoor sensors send data from two internal sensors, but indoor sensors only have one
                // We have to verify exterior/interior, and if exterior, whether both sensors are working or only 1
                var statsA;
                var statsB = { lastModified: 0 };
                var dataA;
                var dataB;
                var newest = 0;

                // Basic sanity check
                if (!data.results || !data.results[0] || !data.results[0].Stats) {
                        return;
                }

                dataA = data.results[0];
                statsA = JSON.parse(dataA.Stats);
                if (data.results[1] && data.results[1].Stats && data.results[0].DEVICE_LOCATIONTYPE !== 'inside') {
                        dataB = data.results[1];
                        statsB = JSON.parse(dataB.Stats);
                }

                newest = Math.max(statsA.lastModified, statsB.lastModified);
                if (newest <= this.lastupdate) {
                        return;
                }
                this.lastupdate = newest;

                var va = statsA[this.statsKey];
                var vb = statsB[this.statsKey];
                if (va && vb) {
                        va = (va + vb) / 2;
                }
                else if (!va) {
                        va = vb || 0;
                }
                var pm10 = parseFloat(dataA.pm10_0_atm);
                if (dataB) {
                        pm10 = (pm10 + parseFloat(dataB.pm10_0_atm)) / 2;
                }

                var adjustTempF = Math.min(Math.max(parseFloat(this.adjustTempF), -50), 50);
                var tempC = (parseFloat(dataA.temp_f) + adjustTempF - 32) * 5 / 9;

                var adjustHum = Math.min(Math.max(parseFloat(this.adjustHum), -100), 100);
                var hum = parseFloat(dataA.humidity) + adjustHum;

                var pm2_5 = this.adjustPM(va, hum);
                var aqi = this.calculateAQI2_5(pm2_5);
                if (this.includePM10) {
                        // If we include PM10 measurements in the AQI, we select the highest of the two
                        aqi = Math.max(aqi, this.calculateAQI10(pm10));
                }

                this.airQuality.updateCharacteristic(Characteristic.PM2_5Density, pm2_5.toFixed(2));
                this.airQuality.updateCharacteristic(Characteristic.PM10Density, pm10.toFixed(2));
                this.airQuality.updateCharacteristic(Characteristic.AirQuality, this.transformAQI(aqi));

                this.temperature.updateCharacteristic(Characteristic.CurrentTemperature, tempC);
                this.humidity.updateCharacteristic(Characteristic.CurrentRelativeHumidity, hum);

    if (this.verboseLogging) {
      this.log.debug("PurpleAir %s pm2_5 is %s, pm10 is %s, AQI is %s, Air Quality is %s. Temperature is %sC. Humidity is %s%%",
        this.statsKey, pm2_5.toString(), pm10.toFixed(2), aqi.toString(), this.airQualityString(aqi), tempC.toFixed(1), hum.toFixed(1));
    }
        },

        adjustPM(pm, rh) {
                switch (this.adjust) {
                        case 'EPA':
                                pm = 0.534 * pm - 0.0844 * rh + 5.604;
                                break;
                        case 'LRAPA':
                                pm = 0.5 * pm - 0.66;
                                break;
                        case 'AQANDU':
                                pm = 0.778 * pm + 2.65;
                                break;
                        case 'NONE':
                        default:
                                break;
                }
                return pm;
        },

        calculateAQI2_5: function (pm) {
                var aqi;
                if (pm > 500) {
                        aqi = 500;
                }
                else if (pm > 350.5) {
                        aqi = this.remap(pm, 350.5, 500.5, 400, 500);
                }
                else if (pm > 250.5) {
                        aqi = this.remap(pm, 250.5, 350.5, 300, 400);
                }
                else if (pm > 150.5) {
                        aqi = this.remap(pm, 150.5, 250.5, 200, 300);
                }
                else if (pm > 55.5) {
                        aqi = this.remap(pm, 55.5, 150.5, 150, 200);
                }
                else if (pm > 35.5) {
                        aqi = this.remap(pm, 35.5, 55.5, 100, 150);
                }
                else if (pm > 12) {
                        aqi = this.remap(pm, 12, 35.5, 50, 100);
                }
                else if (pm > 0) {
                        aqi = this.remap(pm, 0, 12, 0, 50);
                }
                else {
                        aqi = 0
                }
                return Math.round(aqi);
        },

        calculateAQI10: function(pm) {
                var aqi;
                if (pm >= 605) {
                        aqi = 500;
                }
                else if (pm >= 505) {
                        aqi = this.remap(pm, 505, 605, 400, 500);
                }
                else if (pm >= 425) {
                        aqi = this.remap(pm, 425, 505, 300, 400);
                }
                else if (pm >= 355) {
                        aqi = this.remap(pm, 355, 425, 200, 300);
                }
                else if (pm >= 255) {
                        aqi = this.remap(pm, 255, 355, 150, 200);
                }
                else if (pm >= 155) {
                        aqi = this.remap(pm, 155, 255, 100, 150)
                }
                else if (pm >= 55) {
                        aqi = this.remap(pm, 55, 155, 50, 100);
                }
                else {
                        aqi = this.remap(pm, 0, 55, 0, 50);
                }
                return Math.round(aqi);
        },

        /**
         * Return Air Quality Index
         * @param aqi
         * @returns {number}
         */
        transformAQI: function (aqi) {
                // this.log("Transforming %s.", aqi.toString())
                if (aqi == undefined) {
                        return 0; // Error or unknown response
                }
                else if (aqi <= 50) {
                        return 1; // Return EXCELLENT
                }
                else if (aqi <= 100) {
                        return 2; // Return GOOD
                }
                else if (aqi <= 150) {
                        return 3; // Return FAIR
                }
                else if (aqi <= 200) {
                        return 4; // Return INFERIOR
                }
                else if (aqi > 200) {
                        return 5; // Return POOR (Homekit only goes to cat 5, so combined the last two AQI cats of Very Unhealty and Hazardous.
                }
        },

        airQualityString: function (aqi) {
                if (aqi == undefined) {
                        return "Unknown"; // Error or unknown response
                }
                else if (aqi <= 50) {
                        return "Excellent"; // Return EXCELLENT
                }
                else if (aqi <= 100) {
                        return "Good"; // Return GOOD
                }
                else if (aqi <= 150) {
                        return "Fair"; // Return FAIR
                }
                else if (aqi <= 200) {
                        return "Inferior"; // Return INFERIOR
                }
                else if (aqi > 200) {
                        return "Poor"; // Return POOR (Homekit only goes to cat 5, so combined the last two AQI cats of Very Unhealty and Hazardous.
                }
        },

        remap: function (value, fromLow, fromHigh, toLow, toHigh) {
                var fromRange = fromHigh - fromLow;
                var toRange = toHigh - toLow;
                var scaleFactor = toRange / fromRange;

                // Re-zero the value within the from range
                var tmpValue = value - fromLow;
                // Rescale the value to the to range
                tmpValue *= scaleFactor;
                // Re-zero back to the to range
                return tmpValue + toLow;
        },


        identify: function (callback) {
                this.log("Identify requested!");
                callback(); // success
        },

        getServices: function () {
                /**
                 * Informations
                 */
                var informationService = new Service.AccessoryInformation();
                informationService
                        .updateCharacteristic(Characteristic.Manufacturer, "PurpleAir")
                        .updateCharacteristic(Characteristic.Model, "JSON_API")
                        .updateCharacteristic(Characteristic.SerialNumber, this.purpleID);

                /**
                 * airQuality, temperature and humidity
                 */
                this.airQuality = new Service.AirQualitySensor('Air Quality');
                this.airQuality.getCharacteristic(Characteristic.AirQuality);
                this.airQuality.getCharacteristic(Characteristic.StatusFault);
                this.airQuality.getCharacteristic(Characteristic.PM2_5Density);
                this.airQuality.getCharacteristic(Characteristic.PM10Density);

                this.temperature = new Service.TemperatureSensor('Temperature');
                this.temperature.getCharacteristic(Characteristic.CurrentTemperature).setProps({ minValue: -40, maxValue: 125 });

                this.humidity = new Service.HumiditySensor('Humidity');
                this.humidity.getCharacteristic(Characteristic.CurrentRelativeHumidity);

                this.airQuality.isPrimaryService = true;
                this.airQuality.linkedServices = [ this.temperature, this.humidity ];

                return [ informationService, this.airQuality, this.temperature, this.humidity ];
        }
};
