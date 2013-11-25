
var objectPool = [];

var SessionItem = function () {
    this.initialize.apply(this, arguments);
}

SessionItem.useObjectPool = true;

SessionItem.maxResets = 10;

SessionItem.maxPoolSize = 20;

SessionItem.create = function (id, expire, data) {
    
    if (SessionItem.useObjectPool && objectPool.length) {
        return objectPool.pop().reset(id, expire, data);
    }
    
    return new SessionItem(id, expire, data);
    
}

SessionItem.prototype = {

    _resets: 0,
    
    initialize: function (id, expire, data) {
        this.reset(id, expire, data);
    },
    
    reset: function (id, expire, data) {
        this._id = id;
        this._expire = expire;
        this._data = data;
        this._resets++;
        
        return this;
    },

    get: function (field) {
        return this._data[field];
    },

    each: function (cb) {
        
        var i;
        
        for (i in this._data) {
            cb(i, this._data[i]);
        }
        
    },
    
    appendTo: function (obj) {
        this.each(function (k,v) {
            obj[k] = v;
        });
    },
    
    is_expired: function () {
        return Date() >= this._expire;
    },
    
    destroy: function () {
        this._id = null;
        this._expire = null;
        this._data = null;
        
        if (    SessionItem.useObjectPool &&
                objectPool.length < SessionItem.maxPoolSize &&
                this._resets <= SessionItem.maxResets
                                                                ){
            objectPool.push(this);

        }
    }

};

module.exports = SessionItem;