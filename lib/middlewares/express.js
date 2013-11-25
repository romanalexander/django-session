

var ExpressMiddleware = function () {
    this.initialize.apply(this, arguments);
}

ExpressMiddleware.prototype = {

    initialize: function(djsess, options) {
        
        var options = options || {};
        
        this._djsess = djsess;
        this._cookiename = options.cookiename || 'sessionid';
        this._name = options.name || null;
        
    },
    
    getMiddleware: function () {
        
        var self = this;
        
        return function (req, res, next) {
            
            if (typeof req.cookies == "undefined") {
                throw new Error("No cookies pressent");
            }
            
            if (typeof req.session == "undefined") {
                req.session = {};
            }
            
            if (typeof req.cookies[self._cookiename] != "undefined") {
                
                var sd = {};
                var sid = req.cookies[self._cookiename];
                
                self._djsess.get(sid, function (err, data) {
                    
                    if (err) {
                        throw Error(err);
                    }
                    
                    if (self._name) {
                        req.session[self._name] = {};
                        var so = req.session[self._name];
                    } else {
                        var so = req.session;
                    }
                    
                    console.log(so);
                    data.appendTo(so);
                    
                    next();
                    
                });
                
            } else {
                next();
            }
        }
        
    }

};

module.exports = ExpressMiddleware;