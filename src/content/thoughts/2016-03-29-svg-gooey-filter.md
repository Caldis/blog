---
title: "SVG 滤镜应用:制作黏黏球效果"
date: 2016-03-29
summary: "用 feGaussianBlur + feColorMatrix + feBlend 三步实现 gooey 黏黏球融合效果,顺便讲透颜色矩阵滤镜的原理。"
---

## SVG滤镜基础

> 可缩放矢量图形（英语：Scalable Vector Graphics，SVG）是基于可扩展标记语言（XML），用于描述二维矢量图形的一种图形格式。SVG由W3C制定，是一个开放标准。    —— [维基百科](https://zh.wikipedia.org/wiki/%E5%8F%AF%E7%B8%AE%E6%94%BE%E5%90%91%E9%87%8F%E5%9C%96%E5%BD%A2)

SVG中的滤镜是非常强大的工具，这里只介绍了一个基础的SVG滤镜效果应用。 

我们可以通过CSS就可以将SVG滤镜应用到大多数的DOM元素上。

###### SVG滤镜在DOM中的基本定义语法:

```xml
<svg xmlns="http://www.w3.org/2000/svg"version="1.1"> 
    <defs> 
        <filterid="name-your-filter-here"> 
             ... <!-- insert filters here --> ... 
        </filter> ... 
    </defs> 
</svg>
```

###### 想将SVG滤镜应用到DOM元素上，你只需要:

```xml
.selector { 
    filter:url('#name-of-your-filter-here'); 
    /* you can also load filters from external SVGs this way: */ 
    filter:url('filters.svg#name-of-your-other-filter-here'); 
｝
```

你或许需要在某些浏览器上加上Vendor（厂商前缀）属性才能使滤镜正常运行。 

标签内可以包含一个或者数个基本滤镜图元, 例如Blur, Color transform或 shading。完整的基本滤镜图元请参考这里: 

<https://www.w3.org/TR/SVG/filters.html>

###### 让我们看看几个例子:

```xml
<filter id="blur"> 
    <feGaussianBlurin="SourceGraphic"stdDeviation="3"/> 
</filter>
```

这个滤镜将产生3px的blur效果到对应的对象上。 

在**in=”SourceGraphic”**属性中。**in**属性定义了一个基本滤镜图元。**SourceGraphic**关键字表示一个原始的输入图形对象元素。所以只需要指定特定的图形对象作为输入, 滤镜就会应用到上面, 直接了当。

```xml
<filter id="drop-shadow"> 
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="shadow"/> 
    <feOffset in="shadow" dx="3" dy="4" result="shadow"/> 
    <feColorMatrix in="shadow" mode="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0" result="shadow"/> 
    <feBlend in="SourceGraphic" in2="shadow"/> 
</filter>
```

我们观察一下上面这组滤镜中第一个滤镜的**result**属性, 和第二个滤镜的**in**属性，**result**属性可以指定滤镜应用到**result**对应的元素上，而不是应用到**SourceGraphic**。在这组滤镜中，滤镜先对指定对象进行**blur**，然后对**blur**后的对象进行变暗处理，然后对**blur**后的对象和变暗后的对象进行位移运动。 

请注意这组滤镜中最后一个滤镜元素, `<feBlend>` 图元, 它可以用不同的混合模式来把两个对象合成在一起. 在这里, 它示范了如何在一个滤镜图元中输入多个对象（通过in2属性）, 你也可以在任意位置多次调用**SourceGraphic**关键字来混合他们. 这里它输入了**SourceGraphic**和**shadow**两个**result**来将原始的图像叠加到我们处理的阴影效果上。

现在一些基本的SVG滤镜使用方法已经都介绍了一遍了, 现在让我们来看看如何制作出黏黏球的效果！

## 让对象粘起来

基本原理已经在上面阐述过了, 思路是将对象Blur并且还要增加其对比度, 就像两个对象被引力互相吸引了一样。

###### 然而,还有几个需要注意的点:

> - 混合颜色, 除了白色和黑色, 将多种色彩混合并计算出混合后的颜色是一个难点
> - 将两个对象Blur后会使这个对象上的子元素都不可用
> - 内部的元素需要背景颜色来衬托, 所以也不能用透明, 因为透明会使子元素也透明

通过SVG滤镜，我们可以做许多CSS滤镜不能做到的事情，例如仅仅增加对象Alpha（透明通道）通道的对比度, 而不改变颜色；或者用SourceGraphic关键字来让内容一直可见；或者通过处理Alpht通过来使对象的背景也透明。

###### 下面是基本代码:

```xml
<filter id="goo"> 
    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/> 
    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7" result="goo"/> 
    <feBlend in="SourceGraphic" in2="goo"/> 
</filter>
```

> - 首先, 我们将10px的blur应用到了SourceGraphic, 然后将输出命名为blur
> - 然后将一个Color Matrix Filter（颜色矩阵滤镜）应用到blur的输出, 以增加Alpha通道的对比度
> - 最后, 我们将原始的对象叠加至我们处理后的效果上.

## 关于Color Matrix Filter

如果你之前没有接触过Color Matrix Filter, 在这里你可能会有点迷茫, 你可以先想象一个有着四行四列的表格, 如下图：

| * | R | G | B | A | + |
| --- | --- | --- | --- | --- | --- |
| R | 1 | 0 | 0 | 0 | 0 |
| G | 0 | 1 | 0 | 0 | 0 |
| B | 0 | 0 | 1 | 0 | 0 |
| A | 0 | 0 | 0 | 1 | 0 |

每一行都表示一个通道, 分别是红, 绿, 蓝, 和Alpha, 数值表示对应属性的强度. 

前四列也表示同样的属性, 返回他们对应的通道值. 

对于在每个单元格内的值, 都会加到他们的对应行中那个数字与列的乘积 

例如, 一个0.5在R行G列, 对每个像素, 就是将红色通道当前的绿色值*0.5. 

最后一列不表示任何通道, 它用于额外的偏移量. 每个通道的值都会落在0-255这个区间内.

###### 上面说了一大串, 其实用起来很简单. 在我们这个例子中, 我们仅仅增加了Alpha通道的对比度, 所以我们的矩阵是这样样子:

| * | R | G | B | A | + |
| --- | --- | --- | --- | --- | --- |
| R | 1 | 0 | 0 | 0 | 0 |
| G | 0 | 1 | 0 | 0 | 0 |
| B | 0 | 0 | 1 | 0 | 0 |
| A | 0 | 0 | 0 | 18 | -7 |

这个矩阵没有对RGB通道进行操作, 而将Alpha通道乘了18, 然后7*255偏移量, 有效地单独增加了透明通道的对比度.

这个滤镜输入到feColorMatrix滤镜中, 我们只需要将他转换为数字序列, 像这样:

```xml
 values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7"
```
