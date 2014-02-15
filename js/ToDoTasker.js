$(document).ready(function($) {
  /* 
    Read the Key-Value named initFlag in LocalStorage. 
    when initFlag is false, it means indexedDB hasn't init, 
    so there will be no need to go on. 
  */
  var localStorage = window.localStorage;
  var initFlag = localStorage.getItem('initFlag') || "false";

  /* instantiate control handle of indexedDB, which named IdbHandler */ 
  var handler = new IdbHandler('ToDoList');

  /* delete the indexedDB named ToDoList, only for test */
  // handler.deleteDB('ToDoList');initFlag=false;localStorage.setItem('initFlag', false);return false;

  /* display a tooltip of timer or done time on li */
  var timerTip = function() {
    $(".recordTitle").on('mouseenter',function(){
      if($(this).attr('data-original-title')) {
        $(this).tooltip('show');
      }
    }); 
  }

  /* The task detail must not be empty, so set limit for saving */
  var checkIfFilltheTaskDetail = function() {
    var detailTitle = $('#detailTitle').val();
    if(detailTitle) {
      $('#detailSave').attr("disabled",false);
    } else {
      $('#detailSave').attr('disabled', 'disabled');
    }
  }

  var todoListClickEvt = function(){
    var title = $(this).text();
    var calender = $(this).attr('data-original-title');
    var $clickedLi = $(this);

    /* get timer */
    if(calender) {
      calender = calender.split("：");
      calender = calender[1];
      $('#detailCalender').val(calender);
    }

    $('#detailTitle').val(title);
    $('#detailTodo').attr('task_id', $(this).attr('task_id'));

    checkIfFilltheTaskDetail();

    $('#detailSave').on('click', function() {
      var detailTitle = $('#detailTitle').val();
      var detailCalender = $('#detailCalender').val();
      var task_id = $('#detailTodo').attr('task_id');
      task_id = parseInt(task_id);  //Because of indexedDB's rule, id must be a integer.
      
      if(detailTitle) {
        handler.getRecordByPriKey('task', task_id, function(taskData) {
          taskData.title = detailTitle;
          taskData.rtTime = Date.parse(new Date());
          
          if(detailCalender) {
            if(taskData.timer) {
              handler.getRecordsByIndex('timer', {index:'taskIdIndex',value:task_id}, function(data) {
                data = data[0];
                data.time = detailCalender;
                data.timestamp = Date.parse(detailCalender);
                handler.updateRecordByPriKey('timer', data);
              })
            } else {
              handler.putRecord('timer', {'task_id' : task_id, 'time' : detailCalender, 'timestamp' : Date.parse(detailCalender)});
            }
            taskData.timer = detailCalender;
            $clickedLi.attr('data-original-title', 'timer: '+detailCalender);
            timerTip();
          } else {
            if(taskData.timer) {
              delete taskData.timer;
              handler.deleteRecordByIndex('timer', {index:'taskIdIndex',value:task_id});
            }
            $clickedLi.removeAttr('data-original-title');
          }
          handler.putRecord('task', taskData, function() {
            $clickedLi.text(detailTitle);
            $('#detailTodo').modal('hide');
          });
          
        });
      }
    });
    $('#detailTodo').modal('show');
  }

  var restoreClickEvt = function() {
    var taskId = $(this).attr('taskId');
    taskId = parseInt(taskId);
    var $clickedLi = $('li[task_id="'+taskId+'"]');
    handler.getRecordByPriKey('task', taskId, function(data) {
      data.status = "todo";
      data.rtTime = Date.parse(new Date());
      delete data.cpTime;
      delete data.cpTimestamp;
      handler.updateRecordByPriKey('task', data, function() {
        $('i[task_id="'+taskId+'"]').prependTo('#todoList');
        $('<i class="icon-ok"></i>').attr('task_id', taskId)
                                    .on('click', buttonOkClickEvt)
                                    .prependTo('#todoList');
        $clickedLi.removeAttr('data-original-title')
                  .removeClass('btn-success')
                  .off('click', doneListClickEvt)
                  .on('click', todoListClickEvt)
                  .prependTo('#todoList');
        $('#detailDone').modal('hide');
      });
    });
  }

  var doneListClickEvt = function() {
    var $clickedLi = $(this);
    var taskId = $(this).attr('task_id');
    taskId = parseInt(taskId);
    var title = $(this).text();
    var calender = $(this).attr('data-original-title');
    $('#detailDone textarea').val(title);
    $('#detailDone h5').text(calender);
    $('#detailDone').modal('show');
    $('#restore').attr('taskId', taskId);
  }

  var buttonOkClickEvt = function() {
    var task_id = parseInt($(this).attr('task_id'));
    handler.getRecordByPriKey('task', task_id, function(data) {
      data.status = 'done';
      if(data.timer) {
        delete data.timer;

        /* delete timer in indexedDB */
        handler.deleteRecordByIndex('timer', {index: 'taskIdIndex', value: task_id});
      }
      delete data.rtTime;
      var now = new Date();
      data.cpTime = now.format("yyyy-MM-dd hh:mm");
      data.cpTimestamp = Date.parse(now);

      /* update task status in indexedDB*/
      handler.updateRecordByPriKey('task', data, function() {
        $("i").remove(".icon-ok[task_id='" + task_id + "']");
        $("i[task_id='" + task_id + "']").prependTo("#doneList");
        $("li[task_id='" + task_id + "']").addClass("btn-success")
                          .attr('data-toggle', 'tooltip')
                          .attr('data-original-title', 'done time: '+data.cpTime)
                          .off('click', todoListClickEvt)
                          .on('click', doneListClickEvt)
                          .prependTo("#doneList");
      });
    });
  }
  
  var boundAllButtonOkClickEvt = function() {
    $('.icon-ok').on('click', buttonOkClickEvt);     
  }
   
  var buttonRemove = function() {
    $('.icon-remove').on('click', function(evt) {
      var task_id = parseInt($(this).attr('task_id'));

      /* delete the task record in indexedDB */
      handler.deleteRecordByPriKey('task', task_id, function() {
        $("i,li").remove("[task_id='" + task_id + "']");
      });

      /* delete the timer of target task in indexedDB */
      handler.deleteRecordByIndex('timer', {index:"taskIdIndex",value:task_id});
    });     
  }

  var showTodoList = function(data) {
    var $todoBtn, $iconOk, $iconRemove;
    for( var a in data ) {           
      $todoBtn = $('<li class="recordTitle btn"></li>');
      $todoBtn.attr("task_id", data[a]['id']);
      if(data[a]['timer']) {
        $todoBtn.attr("data-toggle", "tooltip");
        $todoBtn.attr("data-original-title", "timer: "+data[a]['timer']);
      }
      $todoBtn.text(data[a]['title']);

      $iconOk = $('<i class="icon-ok"></i>'); 
      $iconOk.attr("task_id", data[a]['id']);
      $iconRemove = $('<i class="icon-remove"></i>');
      $iconRemove.attr("task_id", data[a]['id']);

      $("#todoList").append($todoBtn);
      $("#todoList").append($iconOk);
      $("#todoList").append($iconRemove);
    }
    timerTip();
    
    $("#todoList li").on('click', todoListClickEvt);
    $('#detailTitle').on('keyup', checkIfFilltheTaskDetail);

    boundAllButtonOkClickEvt();
    buttonRemove();
  }

  var showDoneList = function(data) {
    var $doneBtn, $iconRemove;
    for( var b in data ) {
      $doneBtn = $('<li class="recordTitle btn btn-success"></li>');
      $doneBtn.attr("task_id", data[b]['id']);
      $doneBtn.attr("data-toggle", "tooltip");
      $doneBtn.attr("data-original-title", "done time: "+data[b]['cpTime']);    
      $doneBtn.text(data[b]['title']);

      $iconRemove = $('<i class="icon-remove"></i>');
      $iconRemove.attr("task_id", data[b]['id']);

      $("#doneList").append($doneBtn);
      $("#doneList").append($iconRemove);
    }
    timerTip();

    $('#restore').click(restoreClickEvt);
    $('#doneList li').on('click', doneListClickEvt);

    buttonRemove();
  }

  if(initFlag == "false") {
    var taskIndexes = [{'indexName':'rtTimeIndex','col':'rtTime','unique':false}, 
              {'indexName':'cpTimeIndex','col':'cpTimestamp','unique':false}];
    var timerIndexes = [{'indexName':'taskIdIndex','col':'task_id','unique':true},
                {'indexName':'timerIndex','col':'timestamp','unique':false}];

    handler.createObjectStore([{osName:'task', indexes:taskIndexes},
                  {osName:'timer', indexes:timerIndexes}]);

    localStorage.setItem('initFlag', true);     
  } else {
    handler.getRecordsByIndex('task', {index:"rtTimeIndex",value:"0",type:"upper"}, showTodoList);
    handler.getRecordsByIndex('task', {index:"cpTimeIndex",value:"0",type:"upper"}, showDoneList);
  }

  $(".form_datetime").datetimepicker({
    format: "yyyy-mm-dd hh:ii",
    autoclose: true,
    todayBtn: true,
    pickerPosition: "bottom-left"
  });

  var judge = function() {
    var title = $("#inputTitle").val();
    var tips = '';
    if(!title) {
      tips = 'Please fill the Task Title. o(>﹏<)o';
      $('#alert .modal-body strong').text(tips);
      $('#alert').modal('show');
      return false;
    } else {
      $("#inputTitle").val('');
      return title;
    }
  };
  
  $('#addTask').click(function() {
    $('#taskForm').show();
    $(this).parent().hide();
    $('#addButton').show();

  });

  $('#addButton').click(function(event) {
    var title = judge();
    var timer = $('#inputCalender').val();
    
    if (title) {
      var rowData = {title:title, status:'todo'};
      var now = new Date();
      rowData.rtTime = Date.parse(now);

      $('#taskForm').hide();      
      $('#addTask').parent().show();
      $(this).hide();
      
      var refreshTodoList = function() {
        $("#todoList").empty();
        handler.getRecordsByIndex('task', {index:"rtTimeIndex",value:"0",type:"upper"}, showTodoList);
      }

      if(timer) {
        if (window.webkitNotifications.checkPermission() != 0) {
          window.webkitNotifications.requestPermission();
        }
        rowData.timer = timer;
        var callback = function(task_id) {
          handler.putRecord('timer', {'task_id' : task_id,
               'time' : timer, 'timestamp' : Date.parse(timer)}, refreshTodoList);
        }
      } else {
        var callback = refreshTodoList;
      }

      handler.putRecord('task', rowData, callback);
    }
  });

});
