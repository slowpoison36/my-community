(window.webpackJsonp=window.webpackJsonp||[]).push([[1],{XcHY:function(t,e,n){"use strict";n.d(e,"a",function(){return o});var o=function(){function t(t,e){this.changeDetectorRef=t,this.ngZone=e}return t.prototype.transform=function(t){var e=this;this.removeTimer();var n=new Date(t),o=new Date,a=Math.round(Math.abs((o.getTime()-n.getTime())/1e3)),r=Number.isNaN(a)?1e3:1e3*this.getSecondsUntilUpdate(a);this.timer=this.ngZone.runOutsideAngular(function(){return"undefined"!=typeof window?window.setTimeout(function(){e.ngZone.run(function(){return e.changeDetectorRef.markForCheck()})},r):null});var i=Math.round(Math.abs(a/60)),u=Math.round(Math.abs(i/60)),s=Math.round(Math.abs(u/24)),h=Math.round(Math.abs(s/30.416)),c=Math.round(Math.abs(s/365));return Number.isNaN(a)?"":a<=45?"a few seconds ago":a<=90?"a minute ago":i<=45?i+" minutes ago":i<=90?"an hour ago":u<=22?u+" hours ago":u<=36?"a day ago":s<=25?s+" days ago":s<=45?"a month ago":s<=345?h+" months ago":s<=545?"a year ago":c+" years ago"},t.prototype.ngOnDestroy=function(){this.removeTimer()},t.prototype.removeTimer=function(){this.timer&&(window.clearTimeout(this.timer),this.timer=null)},t.prototype.getSecondsUntilUpdate=function(t){return t<60?2:t<3600?30:t<86400?300:3600},t}()}}]);