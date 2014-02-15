$(document).ready(function($) {
  function checkTimer(data) {
    var dataLength = data.length;
    var pointer = 0;
    var recordArr = [];

    var now_timestamp = Date.parse(new Date()); 
    
    function remind(task_id) {
      if(task_id) {
        handler.getRecordByPriKey('task', task_id, function(data) {
          recordArr.push(data);
          pointer++;
          if(pointer == dataLength) {
            var recordLength = recordArr.length;
            var timerText = 'Your Majesty, you have ' + recordLength + " messages including:\n";
            for(var j in recordArr) {
              timerText += subString(recordArr[j].title, 30) + "…… ;\n";  
            }console.log(timerText);
            var notification = window.webkitNotifications.createNotification('/img/icon.jpg', 'Time\'s up!', timerText);
            notification.replaceId = "timer"; 
            notification.show();
          }
        });     
      }
    }

    for(var i in data) {
      if(data[i].timestamp <= now_timestamp) {
        remind(data[i].task_id);
      }
    }
  }

  function timer() {    
    var initFlag = localStorage.getItem('initFlag') || "false";

    /* 
      Read the Key-Value named initFlag in LocalStorage. 
      when initFlag is false, it means indexedDB hasn't init, 
      so there will be no need to go on. 
    */
    if(initFlag === "false"){
      return false;
    }

    /* get all timers record and put them into the function, checkTimer */
    handler.getRecordsByIndex('timer', {index:'timerIndex', value:0, type:'lower', direction:'next'}, checkTimer);
  }

  var localStorage = window.localStorage;
  var handler = new IdbHandler('ToDoList');

  setInterval(timer, 30000);
  
});

function subString(str, len, hasDot) { 
  var newLength = 0; 
  var newStr = ""; 
  var chineseRegex = /[^\x00-\xff]/g; 
  var singleChar = ""; 
  var strLength = str.replace(chineseRegex,"**").length; 
  for(var i = 0;i < strLength;i++) 
  { 
    singleChar = str.charAt(i).toString(); 
    if(singleChar.match(chineseRegex) != null) 
    { 
      newLength += 2; 
    }     
    else 
    { 
      newLength++; 
    } 
    if(newLength > len) 
    { 
      break; 
    } 
    newStr += singleChar; 
  } 
   
  if(hasDot && strLength > len) 
  { 
    newStr += "..."; 
  } 
  return newStr; 
} 