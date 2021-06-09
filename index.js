Last login: Tue Jun  8 11:51:28 on ttys000

The default interactive shell is now zsh.
To update your account to use zsh, please run `chsh -s /bin/zsh`.
For more details, please visit https://support.apple.com/kb/HT208050.
Napili-Kai:~ Bill$ !ssh
ssh homebridge.local
Bill@homebridge.local's password: 
Permission denied, please try again.
Bill@homebridge.local's password: 
Permission denied, please try again.
Bill@homebridge.local's password: 
Bill@homebridge.local: Permission denied (publickey,password).
Napili-Kai:~ Bill$ ssh pi@homebridge.local
Linux homebridge 5.10.17+ #1403 Mon Feb 22 11:26:13 GMT 2021 armv6l

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.
Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.

*** Homebridge Raspbian v1.0.21 - Raspberry Pi Zero W Rev 1.1 ***

homebridge was created by nfarina and licensed under the Apache License 2.0.
homebridge-config-ui-x was created by oznu and licensed under the MIT License.

To configure Homebridge browse to the one of the following addresses from 
another device on your network:

* http://homebridge.local:8581
* http://192.168.4.194:8581

All Homebridge configuration can be completed via the Homebridge Web UI.

Homebridge storage path: /var/lib/homebridge
Homebridge config.json path: /var/lib/homebridge/config.json

Restart Homebridge CMD: sudo hb-service restart
View Logs CMD: sudo hb-service logs

Manage Homebridge: sudo hb-config

Last login: Tue Jun  8 08:15:47 2021 from fe80::1026:fe91:a383:9cf4%wlan0
pi@homebridge:~ $ sudo su
root@homebridge:/home/pi# cd /usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor
root@homebridge:/usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor# ls
config.schema.json  index.js  index.js.save  index.js.save.1  index.js.save.2  index.js.save.3	LICENSE  package.json  package-lock.json  README.md
root@homebridge:/usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor# git status
On branch master
Your branch is ahead of 'origin/master' by 2 commits.
  (use "git push" to publish your local commits)

Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

	modified:   index.js
	new file:   index.js.save
	new file:   index.js.save.1
	new file:   index.js.save.2
	new file:   index.js.save.3

root@homebridge:/usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor# vim.tiny index.js
root@homebridge:/usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor# cp index.js index.js.copy
root@homebridge:/usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor# move index.js.copy Volumes/Users/Bill
bash: move: command not found
root@homebridge:/usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor# mv index.js.copy Volumes/Users/B^C
root@homebridge:/usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor# ls /
bin/        dev/        home/       lost+found/ mnt/        proc/       run/        srv/        tmp/        var/        
boot/       etc/        lib/        media/      opt/        root/       sbin/       sys/        usr/        
root@homebridge:/usr/local/lib/node_modules/homebridge-purpleair-aqi-sensor# vi index.js

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
