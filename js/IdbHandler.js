/**
 * IdbHandler, this is a class for indexedDB controller.
 * Although some other browser support indexedDB, IdbHandler is only for Chrome.
 * @author Array-Huang<hyw125@gmail.com>
 * @todo support other browser.
 */

/**
 * IdbHandler Class Constructor
 * @param {string} dbName the name of the DB instance in indexedDB. Commonly, one DB instance for one app.
 */
function IdbHandler(dbName) {
	if(!window.webkitIndexedDB) {
		console.log('error: window.webkitIndexedDB is unavailable! IdbHandler is only for chrome!');
	}
	this.dbName = dbName;
}

IdbHandler.prototype = {
	/* the indexedDB handler of Chrome */
	indexedDB: window.webkitIndexedDB,

	/**
	 * open target DB to get IDBRequest instance for next move.
	 * @return {object} IDBRequest instance. 
	 *                  We can bound a function on the event, named onupgradeneeded, in order to edit the database or objectstore itself.
	 *         			Or we can also bound a function on the other event, named success, in order to get the IDBDatabase instance for data searching and editing.
	 */	
	_openDatabase: function() {
		var request = this.indexedDB.open(this.dbName);
		request.onerror = function(e) {
			console.log(e.target.webkitErrorMessage);		
		}
		return request;
	},

	/**
	 * delete db instance
	 * @param {string} dbName target db instance
	 */
	deleteDB: function(dbName) {
		var request = this.indexedDB.deleteDatabase(dbName);
		request.onsuccess = function(evt) {
			console.log(dbName + ' has been deleted');
		}
		request.onerror = function(evt) {
			console.log("indexedDB.delete Error: " + evt.message);
		}
	},

	/**
	 * Create ObjectStores
	 * @param {string} osName the name of ObjectStore    
	 * @param {array} indexes an object array of indexes, every object stand for an index, included: indexName, col, unique(boolean, if unique index).
	 */
	createObjectStore: function(data) {
		var _request = this._openDatabase();
		var objectStore;
		_request.onupgradeneeded = function(evt) {
			for(var i in data) {
				objectStore = evt.target.result.createObjectStore(data[i].osName, {keyPath: "id", autoIncrement: true});
				for(var key in data[i].indexes) {
					var _index = data[i].indexes[key];
					objectStore.createIndex(_index['indexName'], _index['col'], {'unique':_index['unique']});
				}
			}
		}
	},

	/**
	 * put a new record to the target ObjectStore
	 * @param {string} osName the name of target objectStore
	 * @param {object} data 
	 */
	putRecord: function(osName, data, callback) {
		var _request = this._openDatabase();
		_request.onsuccess = function (evt) {
			var dbObject = evt.currentTarget.result;	//IDBDatabase instance
			var transaction = dbObject.transaction(osName, 'readwrite');
			var objectStore = transaction.objectStore(osName);
			var request = objectStore.put(data);
		    request.onsuccess = function(evt) {
		    	if(callback) {
		    		callback(request.result);
		    	}
		    }
		}
	},

	/**
	 * delete record according to primary key in target ObjectStore
	 * @param {string} osName the name of target ObjectStore
	 * @param {object} id primary key
	 */
	deleteRecordByPriKey: function(osName, id, callback) {
		var _request = this._openDatabase();
		_request.onsuccess = function(evt) {
			var dbObject = evt.currentTarget.result;
			var transaction = dbObject.transaction(osName, 'readwrite');
			var objectStore = transaction.objectStore(osName);
			var request = objectStore.delete(id);
			request.onerror = function(e) {
		        console.log(e.value);
		    }
		    request.onsuccess = function(e) {
		    	console.log('"'+osName+'":'+'NO.' + id + ' data deleted.');
		    	if(callback) {
		    		callback();
		    	}
		    }
		}	
	},

	/**
	 * delete records according to index
	 * @param {string} osName the name of target ObjectStore
	 * @param {object} indexValue the K/V of index, such as: {index:'statusIndex',value:'todo'}
	 */	
	deleteRecordByIndex: function(osName, indexValue) {
		var obj = this;
		this.getRecordsByIndex(osName, indexValue, function(data) {
			for(var i in data) {
				obj.deleteRecordByPriKey(osName, data[i].id);
			}
		});
	},

	/**
	 * update record by primary key in target ObjectStore
	 * @param {string} osName the name of target ObjectStore
	 * @param {object} data target record data
	 */
	updateRecordByPriKey: function(osName, data, callback) {
		if(!data.id) {
			console.log('Missing required parameter: id');
			return false;
		}
		var _request = this._openDatabase();
		_request.onsuccess = function (evt) {
			var dbObject = evt.currentTarget.result;
			var transaction = dbObject.transaction(osName, 'readwrite');
			var objectStore = transaction.objectStore(osName);
			var request = objectStore.put(data);
			request.onerror = function(e) {
		        console.log(e);
		    }
		    request.onsuccess = function(e) {
		    	if(callback) {
		    		callback();
		    	}
		    }
		}	
	},

	/**
	 * get record by primary key
	 * @param {string} osName the name of target ObjectStore
	 * @param {string} id primary key
	 * @param {object} callback the callback function for onsuccess event
	 */
	getRecordByPriKey: function(osName, id, callback) {
		var _request = this._openDatabase();
		_request.onsuccess = function (evt) {
			var dbObject = evt.currentTarget.result;
			var transaction = dbObject.transaction(osName, 'readonly');
			var objectStore = transaction.objectStore(osName);
			var request = objectStore.get(id);
			request.onerror = function(e) {
		        console.log(e.value);
		    }
		    request.onsuccess = function(e) {
		    	callback(request.result);
		    }
		}
	},

	/**
	 * get records by index
	 * @param {string} osName the name of target ObjectStore
	 * @param {object} indexValue the K/V of index, such as: {index:'statusIndex',value:'todo'}
	 * @param {object} callback the callback function for onsuccess event
	 */
	getRecordsByIndex: function(osName, indexValue, callback) {
		var _request = this._openDatabase();
		_request.onsuccess = function (evt) {
			var dbObject = evt.currentTarget.result;
			var transaction = dbObject.transaction(osName, 'readonly');
			var objectStore = transaction.objectStore(osName);
			var index = objectStore.index(indexValue.index);
			var boundKeyRange;
			if(indexValue.type == "lower") {
				boundKeyRange = IDBKeyRange.lowerBound(indexValue.value, false);
			} else if(indexValue.type == "upper") {
				boundKeyRange = IDBKeyRange.upperBound(indexValue.value, false);
			} else {
				boundKeyRange = IDBKeyRange.only(indexValue.value);
			}
			var direction;
			if(indexValue.direction == "next") {
				direction = "next";
			} else {
				direction = "prev";
			}
			var request = index.openCursor(boundKeyRange, direction);
			var resultArray = [];
			request.onerror = function(e) {
		        console.log(e.value);
		    }
		    request.onsuccess = function(e) {
		    	var cursor = event.target.result;
		    	if(cursor) {
			    	var rowData = cursor.value;
			    	resultArray.push(rowData);
			    	cursor.continue();	    		
		    	} else {
		    		if(callback) {
		    			callback(resultArray);
		    		}		    		
		    	}
		    }
		}	
	},

	/**
	 * get all records in target ObjectStore
	 * @param {string} osName the name of target ObjectStore
	 * @param {object} callback the callback function for onsuccess event
	 */
	getAllRecords: function(osName, callback) {
		var _request = this._openDatabase();
		_request.onsuccess = function (evt) {
			try {
				var dbObject = evt.currentTarget.result;
				var transaction = dbObject.transaction(osName, 'readonly');
				var objectStore = transaction.objectStore(osName);
				var request = objectStore.openCursor();
				var resultArray = [];
				request.onerror = function(e) {
			        console.log(e.value);
			    }
			    request.onsuccess = function(e) {
			    	var cursor = event.target.result;
			    	if(cursor) {
				    	var rowData = cursor.value;
				    	resultArray.push(rowData);
				    	cursor.continue();	    		
			    	} else if(callback){
			    		callback(resultArray);
			    	}
			    }				
			} catch(err) {
				console.log(err);
			}	
		}	
	},
}

/* 
	the test code 
*/
/*var handler = new IdbHandler('test');	
var indexes = [{'indexName' : 'statusIndex', 'col' : 'status', 'unique' : false}];
// handler.createObjectStore('task', indexes);
// handler.putRecord('task', {'title' : 'test', 'status' : 'done'});
// handler.deleteDB('ToDoList');
// handler.deleteRecordByPriKey('task',1);
// handler.getRecordByPriKey('task', 2);	
// handler.updateRecordByPriKey('task', {'id' : 3, 'title' : 'update', 'status' : 'todo'});
var printAll = function(data) {
	console.log(data);
}
handler. getRecordsByIndex('task', {'key' : 'statusIndex', 'value' : 'done'}, printAll);*/

