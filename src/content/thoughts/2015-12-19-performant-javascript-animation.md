---
title: "构建流畅的 JavaScript 动画"
date: 2015-12-19
summary: "从 setTimeout / setInterval 的丢帧问题讲到 requestAnimationFrame,外加厂商前缀 polyfill 和手动控帧率的两种写法。"
---

## 动画

在JavaScript中，创建一个动画是很简单的事， 如果你曾经使用JavaScript来创建过动画，你应该会接触过以下两个函数

```
setTImeout();
setInerval();
```

而以下，是一个典型的动画函数：

```
function draw() {
    // Drawing code goes here
}
setInterval(draw， 100)；
```

以上的这段代码会调用draw()函数来使函数内的动画开始渲染，然后每隔100ms重复一次，直到clearInterval()函数被调用。更灵活的方式是用setTimeout()函数来代替setInterval()，我们将其改写为：

```
function draw() {
    setTimeout(draw, 100);
    // Drawing code goes here
}
draw();
```

这下我们只需要简单的调用draw()函数即可开始我们的动画，同样地，100ms重复一次。

## 流畅的秘诀: 刷新率, 与setInterval()函数

流畅的动画效果与其显示的刷新率息息相关。

刷新率表示的是每一秒中，屏幕中图像的变化的次数，其单位为fps(Frame per secons)。例如60fps代表的是屏幕上的图像每秒钟会变化60次。对于电影，这个数字一般是24fps，而一般的下载视频是30fps。

越高的刷新率则可以为你带来越流畅的动画效果，同时也为处理器带来更大的负担。这也意味着，有可能会由于性能的不足导致跳帧或丢帧，引起画面的跳动或卡顿。由于大部分的屏幕或显示器所支持的最高刷新率为60HZ，所以我们只需要追求将动画帧数提高到60就足够了。

是时候来点数学题了！

```
setInterval(function () {
    animateEverything();
}, 17);
```

由于1s＝1000ms，如果我们想达到60fps每秒，则需要:

> 1000ms ／ 60 = 16.7ms (秒每帧)
> 约等于17ms每帧

上面的17就是这么来的。

## 那么setTImeout()和setInterval()又有什么问题?

这个问题其实已经在其他地方被讨论过无数次了.那么,这一次又有什么新变化呢?

首先, setTimeout()不会判断你的浏览器触发了什么事件, 页面有可能已经被隐藏在另一个tab页中, 亦或者在不必要的时候一直占用你的CPU, 也或许你的动画已经被滚动到页面不可视的位置,却仍然在刷新. 虽然Chrome会将后台的tab页中的setTimeout()和setInterval()的动画函数抑制到1fps,但我们不能确保其他浏览器也会这么做.

其次, setTimeout()只会在其自身想执行的时候才会执行, 而不是在我们的客户端能够执行其时执行.这意味着, 如果我们的客户端是一个低性能的浏览器, 那么将会导致动画渲染的同时将整个页面重绘. 同时, 如果你的动画帧率于屏幕的帧率不匹配, 将会导致更多的资源损耗.

在同一个页面上同时绘制多个动画也会导致一些问题. 其中的一个解决方法是将需要更新的动画逻辑放到同一个函数中,让他们在同一帧中一次性绘制, 以达到更高的效率, 但前提是这些动画与其他动画不相关联, 例如一些持续绘制的背景粒子特效. 另一个方法是逐个设置动画的时间间隔, 令他们存在一定的时间差, 然而这个方法会导致每次你移动画面中的元素时, 你的浏览器又会重绘整个界面的所有元素, 这下更糟!

## requestAnimationFrame()函数来救你!

要克服以上这些棘手的问题, Mozilla(Firefox浏览器的开发商)提供了一个requertAnimationFrame()函数, 这个函数可以适配所有WebKit核心的浏览器(Safari和Chrome),其也提供了一些内置的的API, 使之能在浏览器中操作一系列元素的动画效果.例如DOM元素,CSS,canvas,WebGL或者其他的玩意

下面是用法:

```
function draw() {
    requestAnimationFrame(draw);
    // Drawing code goes here
}
draw();
```

屌!这用法跟上文提到的setTimeout()的用法完全相同, 只是用requestAnimationFrame()来替代了它. 而且你也可以传入一个函数参数来让其调用,例如你想绘制下面这个名为"element"的元素,只需要:

```
requestAnimationFrame(draw, element);
```

你或许注意到上面这个函数并没有参数来指定时间间隔.那么我们如何才能控制其绘制的帧率呢?这个函数会给予你的浏览器和计算机的性能来计算其绘制的帧率,一般来说,其会稳定在60fps(这是我们显示器绘制流畅的动画所需要的优帧率).关键性的区别是,在这里你要求的目标是浏览器,要求其尽可能以最优最流畅的方式绘制我们的动画.而不是我们手工硬性指定的固定时间间隔.这也意味着, 浏览器可以自行优化requestAnimationFrame()的执行性能, 元素的状态(例如元素不可见时, 或切换到后台时),来优化对计算机的负载.

requestAnimationFrame()的另一个优点是其可以组织所有的动画效果到单个浏览器重绘事件中, 节省性能的消耗.

同时,如果你使用requestAnimationFrame()来绘制你的动画,那应该会十分流畅, 而且会调用GPU加速来保持CPU的低负载,如果你的页面进入了一个新tab,你的浏览器会将控制先前页面的动画暂停,防止其在后台持续占用资源,赞!

## 听起来巨屌! 那么它有什么缺点嘛?

没有什么是完美的. 由于API还比较新, 所以并没有在所有的浏览器中都被支持, 调用其时需要加入厂商前缀, 例如:

```
webkitRequestAnimationFrame();
mozRequestAnimationFrame();
msRequestAnimationFrame();
```

webkit前缀的显然适用于Safari或Chrome
moz前缀的自然对应着Firfox 

IE只有在10或更高的版本才支持以ms作为前缀的msRequestAnimationFrame()函数

这里有一个由Eric Möller(Opera), Paul Irish(Google), and Tino Zijdel(Tweakers.net)提供的polyfill脚本来让我们的浏览器可以直接调用requestAnimationFrame()函数, 而不用附带厂商前缀:

```
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                               || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
            timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
```

如果你想使用setTimeout()在requestAnimationFrame()中作为一些参数的反馈也是可以的, 但是请放在函数的开头而不是尾部, 否则会引起一些莫名其妙的问题. Erik Möller本人是这么说的(原文已不可读).

## 如果我想自己设置帧率?

还剩下一个很明显的问题: 因为在requestAnimationFrame()中我们无法指定动画的帧率, 那么改如何自行控制动画的帧率呢? 例如, 游戏常常会要求其画面在特定的帧率下运行.

等等! 我知道你肯定想到了setInterval(), 但是下面这种方法更有技术含量:

```
var fps = 15;
function draw() {
    setTimeout(function() {
        requestAnimationFrame(draw);
        // Draw code goes here
    }, 1000/fps);
}
```

通关将requestAnimationFrame()放置在setTimeout中, 我们可以获得最优的性能, 同时还能手动指定帧率, 上至60fps.

更有技术含量的方法, 我们预先检查已经从上次绘制之后到当前时刻经过的毫秒数, 再去基于时间差来更新动画的位置:

```
var time;
function draw() {
    requestAnimationFrame(draw);
    var now = new Date().getTime();
    dt = now - (time || now);
    time = now;
    // Draw code goes here ... for example updating a 'x' position:
    // Increase 'x' by 10 units per millisecond
    this.x += 10*dt;
}
```

[这里](https://gist.github.com/joelambert/1002116)是另一个在]Github上一个基于时间绘制三角形的源码, [这里](http://jsfiddle.net/wMkJg/)还有一些简单的跳跳球源码.

最后, [这里](https://www.youtube.com/watch?v=XAqIpGU8ZZk#t=2884s)还有一个来自不存在的网站的视频, 是Google I/O 2012 上关于requestAnimationFrame()的演讲.

玩的愉快!
