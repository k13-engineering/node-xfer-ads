const ads = require("../node-ads");
const assert = require("assert");
const EventEmitter = require("events");

module.exports = {
  "types": {
    'BOOL': ads.BOOL,
    'BYTE': ads.BYTE,
    'WORD': ads.WORD,
    'DWORD': ads.DWORD,
    'SINT': ads.SINT,
    'USINT': ads.USINT,
    'INT': ads.INT,
    'UINT': ads.UINT,
    'DINT': ads.DINT,
    'UDINT': ads.UDINT,
    'LINT': ads.LINT,
    'ULINT': ads.ULINT,
    'REAL': ads.REAL,
    'LREAL': ads.LREAL,
    'TIME': ads.TIME,
    'TIME_OF_DAY': ads.TIME_OF_DAY,
    'TOD': ads.TOD,
    'DATE': ads.DATE,
    'DATE_AND_TIME': ads.DATE_AND_TIME,
    'DT': ads.DT,
    'STRING': ads.STRING
  },
  "symbol": (obj) => JSON.stringify(obj),
  "driver": (opts) => {
    return {
      "connect": () => {
        return new Promise((resolve, reject) => {
          const client = ads.connect(opts, function (err) {
            if (err) {
              reject(err);
            } else {
              const handle = this;

              client.on("notification", (ev) => {
                console.log("notification =", ev);
              });

              let refs = {};

              const emitter = new EventEmitter();
              
              client.on("error", (err) => {
                // TODO: check if error is caused by timeout
                emitter.emit("disconnect");
              });

              resolve({
                "on": emitter.on.bind(emitter),
                "once": emitter.once.bind(emitter),
                "read": (jobs) => {
                  assert(Array.isArray(jobs), "jobs must be an array");
                  assert(jobs.every((job) => typeof job === "string"), "jobs array must only contain strings");

                  return Promise.all(jobs.map((job) => {
                    const props = JSON.parse(job);

                    return new Promise((resolve, reject) => {
                      handle.read(props, (err, result) => {
                        if (err) {
                          reject(err);
                        } else {
                          resolve(result.value);
                        }
                      });
                    });
                  }));
                },
                "write": (jobs) => {
                  return Promise.all(Object.keys(jobs).map((job) => {
                    return new Promise((resolve, reject) => {
                      const props = JSON.parse(job);
                      props.value = jobs[job];
                      
                      handle.write(props, (err) => {
                        if(err) {
                          reject(err);
                        } else {
                          resolve();
                        }
                      });
                    });
                  }));
                },
                "close": () => handle.end()
              });
            }
          });
          client.on("error", (err) => {
            reject(err);
          });
        });
      }
    };
  }
};
