
var querystring = require('querystring');

var mysql = require('mysql');
var pickle = require('jpickle');
var base64 = require('base64');

var sessionItem = require('./sessionitem');

const urler = /^([\w]+)\:\/\/(?:([^:^@]+)(?::([^@]+))?\@)?([^\/]*)(?::(\d+))?((?:\/[^\?^\#]*)*)?(?:\?([^\#]*))?(?:\#(.*))?$/;

var DjangoSession = function () {
    this.initialize.apply(this, arguments);
}

DjangoSession.prototype = {
    
    initialize: function () {
    
        if (arguments.length < 1) {
            var options = {};
        } else if (arguments.length == 1) {
            if (typeof arguments[0] == "string") {
                var options = {
                    url: arguments[0]
                };
            } else {
                var options = arguments[0];
            }
        } else if (arguments.length == 2) {
            var options = arguments[1];
            options['url'] = arguments[0];
        }
        
        this._url = options.url || null;
        this._connectorType = options.connectorType || 'mysql';
        this._connector = options.connector || null;
        this._timeout = options.timeout || 0;
        this._user = options.user || 'root';
        this._password = options.password || '';
        this._host = options.host || 'localhost';
        this._port = options.port || 3306;
        this._dbname = options.dbname || '';
        this._dbtablename = options.dbtablename || 'django_session';
        this._connectorOptions = options.connectorOptions || {};
        this._storageFormat = options.storageFormat || 'pickle';
        
        var uparts = null;
                
        if (this._url) {
            
            if (uparts = this._url.match(urler)) {
                
                this._connectorType = uparts[1];
                this._user = uparts[2] || this._dbuser;
                this._password = uparts[3] || this._password;
                this._host = uparts[4] || this._host;
                this._port = uparts[5] || this._port;
                this._dbname = uparts[6].substr(1) || this._dbname;
                
                if (typeof uparts[7] != "undefined") {
                    this._connectorOptions = querystring.parse(uparts[7]);
                }
                
                this._dbtablename = uparts[8] || this._dbtablename;
                
            }
            
        }
        
        this.connect();
        
    },
        
    _decode_json: function (data, cb) {
        var data = data;
        data = data.replace(/[\n\s\t\r\v]+/,'');
        
        var b = new Buffer(data);
        
        data = base64.decode(b);
        
        data = data.toString();
        
        data = data.replace(/^[\w]{40}\$/,'');
        
        cb(JSON.parse(data));
        
    },
    
    _decode_pickle: function (data, cb) {
        data = data.toString("utf8");
        data = base64.decode(data);

        split_data = data.split(":", 2)[1];

        output = pickle.loads(split_data);

        cb(output);
    },
    
    _decode: function () {
        
        var fname = "_decode_" + this._storageFormat;
        
        if (typeof this[fname] == "function") {
            this[fname].apply(this, arguments);
        } else {
            throw new Error("Format not supported");
        }
        
    },
    
    _mysql_list_sessions: function (cb) {
        
        var sql = 'SELECT * FROM ';
        sql += '`'+this._dbtablename.replace('`','\`')+'`';
        
        var self = this;

        this._connector.query(sql, function (err, items) {
            if (err) {
                cb(err, null);
            } else {
                
                var res = [];
                
                var resf = function (i) {
                    
                    if (items[i]) {
                        self._decode(items[i].session_data, function (data) {
                            
                            res.push(new sessionItem.create(
                                items[i].session_key,
                                items[i].expire_date,
                                data
                            ));
                            
                            resf(i+1)
                            
                        });
                    
                        
                    } else {
                        cb(null, res);
                    }
                    
                }
                
                if (items.length) {
                    resf(0);
                } else {
                    cb(null,[]);
                }
                
            }
        });
        
    },
    
    _mysql_get_session: function (sid, cb) {
        
        var sql = 'SELECT session_data, expire_date FROM ';
        sql += '`'+this._dbtablename.replace('`','\`')+'`';
        sql += ' WHERE session_key = ?';
        
        var self = this;
        
        this._connector.query(sql,[sid], function (err, result) {
            
            if (err) {
                cb (err, null);
            } else {
                if (result.length) {
                    
                    self._decode(result[0].session_data, function (data) {
                        cb(null, sessionItem.create(
                            sid,
                            result[0].expire_date,
                            data
                        ));
                    });
                    
                } else {
                    cb (null, null);
                }
            }
            
        });
        
    },
    
    _mysql_connect: function () {
        
        this._connector = mysql.createClient({
            host     : this._host,
            user     : this._user,
            password : this._password,
            port     : this._port,
            database : this._dbname
        });
        
    },
    
    _connector_exec: function (order, args) {
        
        var fname = '_' + this._connectorType.replace(/[^\w]/,'');
        fname +=  '_' + order.replace(/[^\w]/,'');
        
        if (typeof this[fname] == "function") {
            this[fname].apply(this, args);
        } else {
            throw new Error(fname + " undefined.");
        }
        
    },
    
    connect: function () {
        this._connector_exec('connect', arguments);
    },
    
    get: function () {
        this._connector_exec('get_session', arguments);
    },
    
    list: function () {
        this._connector_exec('list_sessions', arguments);
    },
    
    getMiddleware: function (name, options) {
        
        var middleware = require('./middlewares/' + name);
        
        var omw = new middleware(this, options);
        
        return omw.getMiddleware();
        
    }
};

module.exports = DjangoSession;