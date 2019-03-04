

const app = getApp()
const db = wx.cloud.database();
const _ = db.command;
const myknowDb = db.collection("myknow");
const doneDb = db.collection("DoneDb");
const roleRel = { "慢慢": "妈咪", "赤赤": "爸比"}
const role = { "慢慢": 0, "赤赤": 1 }
const roleData = {0:"妈咪",1:"爸比"}
Page({
  data: {
    avatarUrl: './user-unlogin.png',
    userInfo: {},
    logged: false,
    takeSession: false,
    requestResult: '',
    //做过的事
    cbItems:[
      {name:"insite",value:"鼓励了恰恰"},
      {name:"love",value:"对恰恰说爱你"},
      {name:"video",value:"和恰恰视频啦"},
      {name:"story",value:"讲了有趣的故事给恰恰听"},
      {name:"share",value:"和恰恰分享今天的经历"}
    ],
    //用户基础信息
    ydHb:"-",
    tdHb:"-",
    allHb:"-",
    //初始化今天的赤币值
    tdHbData:0,
    doneThing:"",
    todayDoThing:[],
    userRole:""
  },
  checkboxChange: function (e) {
    let count = e.detail.value.length;
    this.setData({tdHbData:count,todayDoThing:e.detail.value});
  },
  onLoad: function() {
    if (!wx.cloud) {
      wx.redirectTo({
        url: '../chooseLib/chooseLib',
      })
      return
    }    
    // 获取用户信息
    wx.getSetting({
      success: res => {
          wx.getUserInfo({
            openIdList: ["selfOpenId"],
            success: res => {
              this.setData({
                avatarUrl: res.userInfo.avatarUrl,
                userInfo: res.userInfo
              });
              
              //查询数据库，获得用户的3条赤币信息           
              let nickName = this.data.userInfo.nickName;
              console.log(nickName);
              let thisP = this;
              let today = this.onGetToday();
              let yesterday = this.onGetYesterday();
              doneDb.where(
                {nickName:nickName,
                date:_.eq(today).or(_.eq(yesterday))}
              ).get({
                success:function(res){
                  //显示赤币信息到页面上
                  let ydHb = 0;
                  let tdHb =0;
                  let allHb = 0;
                  for(var i=0;i<res.data.length;i++){
                    if(res.data[i]["date"]===today){
                      tdHb = res.data[i]["tdHb"]
                    }else if(res.data[i]["date"]===yesterday){
                      ydHb = res.data[i]["tdHb"];
                    }
                    allHb += res.data[i]["tdHb"];
                  }           
                  thisP.setData({ydHb:ydHb,tdHb:tdHb,allHb:allHb});
                }}
              )
              //myknowDb.add({ data: {"allHb": 0,"tdHb": 0,"userName": "赫然","ydHb": 0}})
              //查询数据库，获得昨日为恰恰做过的事
              var userRole = roleRel[nickName];          
              doneDb.where({
                nickName:nickName,
                date:yesterday
              }).get({
                success:function(res){
                  if(res.data.length===0){
                    thisP.setData({role:userRole,doneThing:"是不是太忙啦"});
                    return;
                  }
                  var done = res.data[0].done;
                  var doneText = "";
                  for(var i=0;i<done.length;i++){
                    if(i<done.length-1){
                      doneText += done[i]+"、";
                    }else{
                      doneText += done[i];
                    }
                  }
                  thisP.setData({ role: userRole,doneThing:doneText});
                }
              })
            },
            fail: (res) => {
              console.log(res)}
          })      
      }
    })
    
  },
  onSubmitDone:function(e){
    let nickName = this.data.userInfo.nickName;
    let tdHbData = this.data.tdHbData*20;
    let thisp = this;
    var today = thisp.onGetToday();
    
    wx.showToast({ title: "爱你～", icon: "success" });
    //存储今天做过的事，如果搜到则更新，没搜到则新建
    doneDb.where({
      nickName:nickName,
      date:today
    }).get({
      success:function(res){      
          if(res &&res.data.length===0){          
            let todayDone = { nickName: nickName, role: role[nickName], done: thisp.data.todayDoThing, date: today,tdHb:tdHbData };
            doneDb.add({ data: todayDone});
          }else{          
            let id = res.data[0]._id;
            let doneToSet = thisp.data.todayDoThing;
            doneDb.doc(id).update({ data: { done: doneToSet, tdHb: tdHbData }});
          }
        //更新总赤币
        doneDb.where({
          nickName: nickName
        }).get({
          success: function (res) {

            let allHb = 0;
            for (var i = 0; i < res.data.length; i++) {
              allHb += res.data[i]["tdHb"];
            }
            console.log(allHb);
            thisp.setData({ tdHb: tdHbData, allHb: allHb });

          }
        })
      }
    })
    
    
  },
  onGetYesterday:function(){
    var today = new Date();
    //处理时间，获得昨天
    today = today.setTime(today.getTime() - 24 * 60 * 60 * 1000);
    var yesterday = new Date(today);
    var day = yesterday.getDate();
    var month = yesterday.getMonth() + 1;
    var nowDate = yesterday.getFullYear();
    var dateData = nowDate + "-" + month + "-" + day;
    return dateData;
  },
  onGetToday: function () {
    var today = new Date();
    var day = today.getDate();
    var month = today.getMonth() + 1;
    var nowDate = today.getFullYear();
    var dateData = nowDate + "-" + month + "-" + day;
    return dateData;
  },
  onSetData:function(ydHb){
      this.setData({ydHb:ydHb});
  },
  onGotUserInfo: function(e) {
    if (!this.logged && e.detail.userInfo) {
      this.setData({
        logged: true,
        avatarUrl: e.detail.userInfo.avatarUrl,
        userInfo: e.detail.userInfo
      })
    }
  },

  onGetOpenid: function() {
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid)
        app.globalData.openid = res.result.openid
        wx.navigateTo({
          url: '../userConsole/userConsole',
        })
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
        wx.navigateTo({
          url: '../deployFunctions/deployFunctions',
        })
      }
    })
  },

  // 上传图片
  doUpload: function () {
    // 选择图片
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {

        wx.showLoading({
          title: '上传中',
        })

        const filePath = res.tempFilePaths[0]
        
        // 上传图片
        const cloudPath = 'my-image' + filePath.match(/\.[^.]+?$/)[0]
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: res => {
            console.log('[上传文件] 成功：', res)

            app.globalData.fileID = res.fileID
            app.globalData.cloudPath = cloudPath
            app.globalData.imagePath = filePath
            
            wx.navigateTo({
              url: '../storageConsole/storageConsole'
            })
          },
          fail: e => {
            console.error('[上传文件] 失败：', e)
            wx.showToast({
              icon: 'none',
              title: '上传失败',
            })
          },
          complete: () => {
            wx.hideLoading()
          }
        })

      },
      fail: e => {
        console.error(e)
      }
    })
  },

})
