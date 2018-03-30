window.addEventListener("load", function () {
    // >> Data to be processed
    document.data = [];
    // >> SQL
    var SQL = "";
    // >> Form Listener
    var form = this.document.querySelector('#form');
    form.addEventListener('submit', ev => {
        ev.preventDefault();

        storeTableData();      

        addToList (document.data);
    });
    // >> Process Table Data
    var storeTableData = function () {
        var FD = new FormData (form);
        var tm = {};
        FD.forEach ((value, key) => {
            tm[key] = value;
        })
        var table = {};
        table.id        = tm.tableId;
        table.name      = tm.table;
        table.attributes = tm.attributes.replace (/\t+/g, "$").replace (/\n+/g, "&")
        table.autoIncremental = tm.autoincremental == "on";
        var methods   = [
            tm.insert   == "on"   ? {method: "INSERT", idWhere: false, includeParams: true}: null,
            tm.update   == "on"   ? {method: "UPDATE", idWhere: false, includeParams: true}: null,
            tm.delete   == "on"   ? {method: "SELECT", idWhere: true,  includeParams: false}: null,
            tm.select   == "on"   ? {method: "DELETE", idWhere: true,  includeParams: false}: null,
            tm.list     == "on"   ? {method: "LIST",   idWhere: false, includeParams: false}: null,
        ]
        table.methods = _.compact (methods);

        document.data.push (table);
    }
    // >> Add to visual List
    var addToList = function (data) {
        var template = $("#template").html();
        $("#target").html(_.template(template)({
            data: data
        }));
    }
    // >> Add to SQL
    var addToSQL = function (sql_process) {
        var SQLBody = $("#SQL")[0];
        SQLBody.innerHTML += sql_process;
    }
    var clearToSQL = function (sql_process) {
        var SQLBody = $("#SQL")[0];
        SQLBody.innerHTML = "";
    }
    // >> Process SQL
    var processSQL = this.document.querySelector('#processSQL');
    processSQL.addEventListener('click', ev => {
        clearToSQL();
        document.data.forEach(el => {
            var sql = ""
            sql = new storedProcedure(el.name, el.methods, el.attributes, el.autoIncremental, el.id).process()  
            addToSQL (sql)
        });
    });
});


var storedProcedure = function (tableName, methods, params, autoIncremental, id) {
    var _this = this;
    _this.sqlOut = "";
    _this.id = id;
    _this.tableName = tableName;
    _this.methods = methods;
    _this.params = params;
    _this.autoIncremental = autoIncremental;
}
storedProcedure.prototype.process = function () {
    var _this = this;
    _this.processParams();
    _.each (_this.methods, method => {
        _this.sql = "";
        _this.method = method.method;
        _this.idWhere = method.idWhere;
        _this.includeParams = method.includeParams;
        _this.setName();
        _this.setParams();
        _this.setMethod();
        _this.sqlOut += _this.sql + "<br><br>";
    }) 
    return _this.sqlOut;
}
storedProcedure.prototype.processParams = function () {
    var _this = this;
    _this.rowsDesc = _this.params.split ('&');
    _this.rowsDesc = _.chain (_this.rowsDesc).map(row => {
        var desc = row.split ('$');
        if (desc[0] == "" || desc[1] == "") return null;
        if (desc[0] == _this.id) _this.idAttr = {
            name: desc[0] || "",
            type: desc[1] || ""
        }
        return {
            name: desc[0] || "",
            type: desc[1] || ""
        }
    }).compact().value();
}
storedProcedure.prototype.setName = function () {
    var _this = this;
    _this.sql += "CREATE PROCEDURE " + _this.method.toLowerCase() + "_" + _this.tableName.toLowerCase() + "<br>";
}
storedProcedure.prototype.setParams = function () {
    var _this = this;
    // >> Add Params
    if (_.size(_this.rowsDesc) > 0 && _this.includeParams) {
        var params = "(";
        _.each (_this.rowsDesc, row => {
            if (_this.method.toLowerCase() == "insert" && row.name == _this.idAttr.name && _this.autoIncremental) {
                return
            } else {
                params += "@P_" + row.name + "\t" + row.type + ",<br>";
            }
        });
        params = params.substring(params.length -5, -5);
        params += ")<br>";
        _this.sql += params;
    }
    else if (_this.idWhere) {
        _this.sql += "(@P_" + _this.idAttr.name + " " + _this.idAttr.type + ")<br>"
    }
}
storedProcedure.prototype.setMethod = function () {
    var _this = this;
    _this.sql += "AS<br>BEGIN<br>";

    var method = "";
    switch (_this.method.toLowerCase()) {
        case "select":
            method += "SELECT * FROM " + _this.tableName;
            if (_this.idWhere) {
                method += " WHERE " + _this.idAttr.name + " = " + " @P_" + _this.idAttr.name
            }
			break;
        case "update":
            method += "UPDATE " + _this.tableName + " SET "
            _.each (_this.rowsDesc, row => {
                if (row.name == _this.idAttr.name && _this.autoIncremental) {
                    return
                } else {
                    method += row.name + " = " + "@P_" + row.name + ",";
                }
            });
            method = method.substring(method.length -1, -1);
            method += " WHERE " + _this.idAttr.name + " = " + " @P_" + _this.idAttr.name
            method += "<br>SELECT * FROM " + _this.tableName + " WHERE " + _this.idAttr.name + " = " + " @P_" + _this.idAttr.name;
			break;
        case "delete":
            method += "DELETE FROM " + _this.tableName
            if (_this.idWhere) {
                method += " WHERE " + _this.idAttr.name + " = " + " @P_" + _this.idAttr.name
            }
            break;
        case "list":
            method += "SELECT * FROM " + _this.tableName;
            break;        
        case "insert":
            method += "INSERT INTO " + _this.tableName + " ("
            _.each (_this.rowsDesc, row => {
                method += row.name + ",";
            });
            method = method.substring(method.length -1, -1);
            method += ") VALUES (";
            _.each (_this.rowsDesc, row => {
                if (row.name == _this.idAttr.name && _this.autoIncremental) {
                    return
                } else {
                    method += "@P_" + row.name + ",";
                }
            });
            method = method.substring(method.length -1, -1);
            method += ")";
            var selectField = _this.autoIncremental ? " @@IDENTITY" : " @P_" + _this.idAttr.name;
            method += "<br>SELECT * FROM " + _this.tableName + " WHERE " + _this.idAttr.name + " = " + selectField;
			break;
    }
    _this.sql += method + "<br>END<br>GO";
    
}