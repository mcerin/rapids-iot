const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const moment = require('moment')

class ArsoWaterSloveniaCrawler {

    constructor(watter_type, URL_file, data_file) {
        this.watter_type = watter_type
        if (this.watter_type == 'sw') {
            this.URL = 'http://www.arso.gov.si/vode/podatki/amp/Ht_30.html'
            this.base_URL = 'http://www.arso.gov.si/vode/podatki/amp/'
            this.tme_parse = 'DD.MM.YYYY hh:mm'
        } else if (this.watter_type == 'gw') {
            this.URL = 'http://www.arso.gov.si/vode/podatki/podzem_vode_amp/podt_30.html'
            this.base_URL = 'http://www.arso.gov.si/vode/podatki/podzem_vode_amp/'
            this.tme_parse = 'DD-MM-YYYY hh:mm'
        }
        this.URL_file=URL_file
        this.data_file=data_file
    }

    // run to crawl
    crawl() {
        let links = null
        let self = this
        fs.readFile(self.data_file + self.URL_file, 'utf-8', function(err, dat) {
            if (err) {
            } else {
                links = dat.trim().split('\n')

                for (let i = 0; i < links.length - 1; i++) {
                    let URL = links[i]
                    self.getData(URL)
                }
            }
        })
    }

    // construct file with URLs with data
    getURLs(URL=this.URL, base_URL=this.base_URL){
        let self = this
        fs.writeFile(self.data_file + self.URL_file, '', function (err) {})
        request(URL, function (err, res, body) {
            if(err)
            {
                console.log(err, "error occured while hitting URL");
            }
            else
            {
                const $ = cheerio.load(body)
                $('map>area').each(function() {
                    var link = $(this).attr('href');
                    
                    link = base_URL + link
                    fs.appendFile(self.data_file + self.URL_file, link + '\n', function (err) {})
                })
            }
        });
    }

    // Get data and save it in csv file
    getData(URL) {
        let data = []
        let station_name = ''
        let from_time = 0
        let self = this
        request(URL, function (err, res, body) {
            if(err) {
                console.log(err, "error occured while hitting URL");
            }
            else {
                const $ = cheerio.load(body)
    
                $('body>table>tbody>tr>td.vsebina>h1').each(function() { // find name of station
                    station_name = $(this).text().replace(/ /g, "_").replace(/_-_/g, "-").replace(/\//g, "-")
                })
    
                console.log(station_name)
                fs.readFile(self.data_file + station_name + '.csv', 'utf-8', function(err, dat) {
                    if (err) {
                        data = self.findData($, data, from_time)
                        self.saveToFile(data, station_name)
                    }
                    else {
                        from_time = self.checkLastDate(dat)
                        data = self.findData($, data, from_time)
                        self.saveToFile(data, station_name)
                    }
                })
            }    
        })
    }

    // save data to file
    saveToFile(data, station_name) {
        let self = this
        for (let i = data.length; i > 0; i--) {
            fs.appendFileSync(self.data_file + station_name + '.csv', String(data[i-1])+'\n', function (err) {})
        }
    }

    // find data in HTML
    findData($, data, from_time) {
        let get_out = false
        let self = this
        $('body>table>tbody>tr>td.vsebina>table.podatki>tbody>tr').each(function() { // get data
            let new_data = []
            let iter_num = 0
    
            $(this).find('td').each(function () {
                var item = $(this).text()
    
                if (iter_num == 0) {
                    item = String(moment(item, self.time_parse).format())
                    if (from_time >= Date.parse(item)) {
                        get_out = true
                        return false
                    }
                }
                new_data.push(item)
                iter_num += 1
            });
    
            if (get_out) {
                return false
            }
            if(self.watter_type == 'gw' && new_data[1] == '-' && new_data[2] == '-') {
                // do not write when no data for ground water
            } else if (self.watter_type == 'sw' && new_data[1] == '-' && new_data[2] == '-' && new_data[3] == '-') {
                // do not write when no data for surface water
            } else {
                data.push(new_data)
            }
            
        })
        return data
    }

    // check last date of data
    checkLastDate(dat) {
        let lines = dat.trim().split('\n');
        let lastLine = lines.slice(-1)[0];
    
        let splitLine = lastLine.split(',');
        let from_time = Date.parse(splitLine.slice(0)[0]);
        
        return from_time
    }
}

var cr_sur = new ArsoWaterSloveniaCrawler(watter_type='sw', URL_file='linksSurface.txt', data_file='./data_surfacewatter/')
var cr_gr = new ArsoWaterSloveniaCrawler(watter_type='gw', URL_file='linksGround.txt', data_file='./data_groundwater/')

//cr_sur.getURLs()
//cr_gr.getURLs()

cr_sur.crawl()
cr_gr.crawl()