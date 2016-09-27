"use strict";

module.exports = webservicesVdoc;

const promise = require('promise');
const http = require('http');

function webservicesVdoc(url, login, password) {
    let token;

    return {
        authentication: authentication,
        getListGroup: getListGroup,
        getListMail: getListMail
    };

    function getListGroup() {
        return new promise((resolve, reject) => {
            if (typeof token != 'undefined') {
                let xmlJson = {
                    view: {
                        $: {
                            'mlns:vw1': 'http://www.axemble.com/vdoc/view'
                        },
                        header: {
                            configuration: {
                                param: {
                                    $: {
                                        name: 'maxlevel',
                                        value: -1
                                    }
                                }
                            },
                            definition: {
                                $: {
                                    class: 'com.axemble.vdoc.sdk.interfaces.IOrganization'
                                },
                                definition: {
                                    $: {
                                        class: 'com.axemble.vdoc.sdk.interfaces.IGroup'
                                    }
                                }
                            }
                        }
                    }
                };

                let xml = builder.buildObject(xmlJson);

                let options = {
                    host : "vdoc-prod.vdocsuite.com",
                    path : '/vdoc/navigation/flow?module=directory&cmd=view&_AuthenticationKey='+authenticateToken,
                    method: "POST"
                };

                executeRequest(options, xml).then(function(e) {
                    parser.parseString(e, function (err, result) {
                        storage.set(storageGroupList, result, (error) => {
                            if (error) throw error;
                        });
                        resolve(result)
                    });
                });
            } else {
                authentication().then(function(data) {
                    
                }, function(error) {
                    reject({
                        code: 201,
                        message: "Authentication failed"
                    })
                })
            }

        });
    }

    function authentication() {
        return new promise((resolve, reject) => {
            let account = {
                authenticate: {
                    header: {
                        $: {
                            login: login,
                            password: password,
                            timeout: 36000
                        }
                    }
                }
            };

            let xml = builder.buildObject(account);

            let options = {
                host: url,
                path: '/vdoc/navigation/flow?module=portal&cmd=authenticate',
                method: "POST"
            };

            executeRequest(options, xml).then(function (e) {
                parser.parseString(e, function (err, result) {
                    token = result.authenticate.body["0"].token["0"].$.key.
                    resolve(result, err);
                });
            }, function(e) {
                reject(e);
            });
        });
    }


    //@private
    function executeRequest(options, body) {
        return new promise((resolve, reject) => {
            var req = http.request(options, function (res) {
                res.setEncoding('utf8');
                let output = '';
                res.on('data', function (chunk) {
                    output += chunk;
                });

                res.on('end', function () {
                    resolve(output);
                });
            });
            req.on('error', function (e) {
                reject(e)
            });
            req.write(body);
            req.end();
        });
    }
}