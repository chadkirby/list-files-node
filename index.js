var fs = require('fs');
var path = require('path');

sepPat = RegExp(path.sep + "$");

function dirStatSync(dirname, opts) {
  var asc, d, dotFn, f, filter, i, indexFn, j, len, map, name, pathToFile, sortBy, sortField;
  if (opts == null) {
    opts = {};
  }
  sortField = opts.sortField;
  sortBy = opts.sortBy;
  map = opts.map;
  filter = opts.filter;

  if (sortField == null) {
    sortField = sortBy;
  }
  indexFn = (function() {
    if (typeof opts.index === 'function') {
      sortField = true;
      return function(o) {
        o.index = opts.index(o);
        return o;
      };
    } else if ((sortField != null) || (sortBy != null)) {
      switch (sortField) {
        case 'mtime':
        case 'atime':
        case 'ctime':
        case 'time':
          if (sortField === 'time') {
            sortField = 'mtime';
          }
          return function(o) {
            o.index = o.stat[sortField].getTime();
            return o;
          };
        case 'name':
          if (opts.caseSensitive) {
            return function(o) {
              o.index = o.name;
              return o;
            };
          } else {
            return function(o) {
              o.index = o.name.toLowerCase();
              return o;
            };
          }
          break;
        case 'numeric':
          return function(o) {
            var idx;
            idx = parseFloat(path.basename(o.name).match(/\d+(?:\.\d*)?/));
            if (isNaN(idx)) {
              idx = Infinity;
            }
            o.index = idx;
            return o;
          };
        case 'dev':
        case 'ino':
        case 'mode':
        case 'nlink':
        case 'uid':
        case 'gid':
        case 'rdev':
        case 'size':
        case 'blksize':
        case 'blocks':
          return function(o) {
            o.index = parseInt(o.stat[sortField]);
            return o;
          };
        default:
          throw "dirStatSync: Don't know how to sort by sortField: '" + sortField + "'.";
      }
    } else {
      return function(o) {
        return o;
      };
    }
  })();
  if (!sepPat.test(dirname)) {
    dirname += path.sep;
  }
  dotFn = opts.all ? function() {
    return true;
  } : function(name) {
    return !/^\./.test(name);
  };
  d = (function() {
    var j, len, ref, results;
    ref = fs.readdirSync(dirname);
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      name = ref[j];
      if (!(dotFn(name))) {
        continue;
      }
      pathToFile = dirname + name;
      results.push(indexFn({
        name: opts.includePath ? pathToFile : name,
        stat: fs.statSync(pathToFile)
      }));
    }
    return results;
  })();
  if (sortField != null) {
    asc = (function() {
      switch (false) {
        case !(opts.ascending === false):
        case !opts.descending:
        case !/^des/.test(opts.sort):
          return 1;
        default:
          return -1;
      }
    })();
    d.sort(function(a, b) {
      switch (false) {
        case !(a.index < b.index):
          return asc;
        case !(a.index > b.index):
          return -asc;
        default:
          return 0;
      }
    });
  }
  if ((filter != null) || (map != null)) {
    if (map == null) {
      map = function(o) {
        return o;
      };
    }
    if (filter == null) {
      filter = function() {
        return true;
      };
    }
    d = (function() {
      var j, len, results;
      results = [];
      for (i = j = 0, len = d.length; j < len; i = ++j) {
        f = d[i];
        if (filter(f, i)) {
          results.push(map(f, i));
        }
      }
      return results;
    })();
  }
  if (opts.stripStats || opts.namesOnly) {
    return (function() {
      var j, len, ref, results;
      results = [];
      for (j = 0, len = d.length; j < len; j++) {
        f = d[j];
        results.push((ref = f.name) != null ? ref : f);
      }
      return results;
    })();
  } else {
    for (j = 0, len = d.length; j < len; j++) {
      f = d[j];
      if (f.index != null) {
        delete f.index;
      }
    }
    return d;
  }
}

function listByFilter(dirname, typeFilter, opts) {
  var filter;
  if (opts == null) {
    opts = {};
  }
  if (!(opts.long || opts.stats)) {
    opts.namesOnly = true;
  }
  if (typeof opts.filter === 'function') {
    filter = opts.filter;
    opts.filter = function(f) {
      return typeFilter(f) && filter(f);
    };
  } else {
    opts.filter = typeFilter;
  }
  return dirStatSync(dirname, opts);
}

function listFiles(dirname, opts) {
  var filter;
  if (opts == null) {
    opts = {};
  }
  filter = function(f) {
    return f.stat.isFile();
  };
  return listByFilter(dirname, filter, opts);
}

module.exports = listFiles;
