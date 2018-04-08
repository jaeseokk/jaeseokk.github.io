---
layout: post
title:  "HOC, Render props와 함께 개선된 React component 구현하기"
---

여러 React component를 구현하다보면 component간 중복되는 코드가 나타나기 시작하고 이러한 코드들을 보다 효율적이고 깔끔하게 관리하고 싶은 욕구가 생기게 된다. 이와 같은 문제는 공통된 코드를 재사용하거나 공통된 관심사를 분리함으로써 해결할 수 있는데, React에서 이를 적용할 수 있는 대표적인 구현 패턴 2가지, 'HOC(Higher Order Component)', 'render props'에 대해 알아보기로 한다.

## Higher Order Component
> Concretely, a higher-order component is a function that takes a component and returns a new component.

React 공식 문서에 나온 HOC에 관한 설명이다. 말 그대로 HOC는 어떠한 component를 취하여 새로운 component를 반환하는 함수이다.
코드로 표현하면 아래와 같다.

```javascript
const EnhancedComponent = hoc(WrappedComponent, ...);
```

`hoc()`함수가 `WrappedComponent`와 혹은 그 외 값을 인자로 받고 새로운 component를 `EnhancedComponent`에 반환해주고 있다. 재사용이 필요한 component를 함수 인자로 넣어주면 필요한 로직을 추가로 구성한 새로운 component가 반환되는 것이다.

### hoc 활용 예시

어떤 component들에 특정 react life-cycle에서 로깅을 하는 로직을 추가한다고 가정해보자.

```js
class Component1 extends React.Component {
    componentDidMount() {
        console.log('Component did mount');
    }
    
    componentWillReceiveProps(nextProps) {
        console.log('Component will receive Props');
    }

    componentWillUnmount() {
        console.log('Component will unmount');
    }

    render() {
        return (
            <div>
                This is Component1.
            </div>
        )
    }
}

class Component2 extends React.Component {
    componentDidMount() {
        console.log('Component did mount');
    }
    
    componentWillReceiveProps(nextProps) {
        console.log('Component will receive Props');
    }

    componentWillUnmount() {
        console.log('Component will unmount');
    }

    render() {
        return (
            <div>
                This is Component2.
            </div>
        )
    }
}
```

`Component1`과 `Component2`는 각각 `componentDidMount()`, `componentWillReceiveProps()`, `componentWillUnmount()`라는 react life-cycle api를 통해 로깅을 하는 동일한 코드를 갖고 있다. HOC를 이용하여 공통 코드를 분리하여 코드를 다시 작성해보면 아래와 같다.

```js
class Component1 extends React.Component {
    render() {
        return (
            <div>
                This is Component1.
            </div>
        )
    }
}

class Component2 extends React.Component {
    render() {
        return (
            <div>
                This is Component2.
            </div>
        )
    }
}

const withLogging = (WrappedComponent) => {
    return class extends React.Component {
        componentDidMount() {
            console.log('Component did mount');
        }
        
        componentWillReceiveProps(nextProps) {
            console.log('Component will receive Props');
        }

        componentWillUnmount() {
            console.log('Component will unmount');
        }

        render() {
            return (
                <WrappedComponent {...this.props} />
            )
        }
    }
};

const Component1WithLogging = withLogging(Component1);
const Component2WithLogging = withLogging(Component2);
```

이전 코드와 달라진 점을 확인해보면, `withLogging()`에서 react component를 인자로 받고 중복되는 코드였던 로깅 로직을 추가 구성한 새로운 컴포넌트를 반환하도록 구현하고, `Component1`과 `Component2`를 넣어주어 로깅 로직이 포함된 `Component1WithLogging`과 `Component2WithLogging`을 만들었다. HOC를 활용하니 중복된 코드가 제거되고 한결 간결해진 것을 알 수 있다. 또한 `Component1`, `Component2` 외에 해당 로직이 필요한 component가 생긴다면 해당 코드를 또 작성할 필요 없이 `withLogging()`을 이용하여 생성하면 된다.

### 변경(mutation)이 아닌 구성(composition)으로

여기서 중요한 점은 HOC가 입력받은 component를 변경하여 반환하는 것이 아니라 새로운 component로 구성하여 반환한다는 것이다. 만약 `withLogging()`이 아래와 코드와 같이 입력받은 component의 필드에 직접 접근, 변경하여 로깅 로직이 추가된 컴포넌트를 반환했다면, 해당 로직이 포함된 component를 구현할 순 있어도 입력한 component는 이미 변경되어버려서 재사용하기 어려워질 뿐 아니라 또다른 HOC와 함께 사용할 시 충돌이 발생할 가능성이 생기게 된다.

```js
const withLogging = (WrappedComponent) => {
    /*
    입력받은 component를 직접 변경.
    입력받은 component나 이전에 수행된 HOC에서 구현된 로직들이 overridde 되어버림.
    */
    WrappedComponent.prototype.componentDidMount = () => {
        console.log('Component did mount');
    }

    WrappedComponent.prototype.componentWillReceiveProps = (nextProps) => {
        console.log('Component will receive Props');
    }

    WrappedComponent.prototype.componentWillUnmount = () => {
        console.log('Component will unmount');
    }
    
    return WrappedComponent;
};
```

따라서 재사용성을 가지고 있고 여러 HOC들과 조합하여 사용 가능한 HOC를 위해서는 component를 변경하여 반환하는 것이 아닌 component를 새롭게 구성(composition)하여 반환하도록 구현 해야한다.

## Render Props
> The term “render prop” refers to a simple technique for sharing code between React components using a prop whose value is a function.

역시 React 공식 문서에 나와있는 'render props'에 관한 설명이다. render props는 component의 props로 또다른 component를 반환하는 function을 넣어줌으로써 코드를 재사용하는 기법이다. props의 이름은 어떤것으로 하든 상관 없지만 주로 `render`라는 이름을 쓰거나 component의 children 요소로 넣어준다.

```js
// render props를 'render'라는 이름의 props로 넣어준 경우
<ComponentHasRenderProps render={something => (
  <div>
    {something}
  </div>
)} />

// render props를 component의 children 요소로 넣어준 경우
<ComponentHasRenderProps>
    {something => (
        <div>
            {something}
        </div>
    )}
</ComponentHasRenderProps>
```

### Render props 활용 예시
현재 페이지 상태를 노출하고 있고, selector element를 클릭 했을때 이전 혹은 다음 페이지 상태로 변경하는 `Navigator` component를 구현한다고 가정해보자.

```js
class Navigator extends React.Component {
    static propTypes = {
        default: PropTypes.number,
        min: PropTypes.number,
        max: PropTypes.number,
    }

    static defaultProps = {
        default: 0,
        min: 0,
        max: 10,
    }

    constructor(props) {
        super(props);

        this.state = {
            current: this.props.default,
        }

        this.onPrevSelectorClick = this.onSelectorClick.bind(null, -1);
        this.onNextSelectorClick = this.onSelectorClick.bind(null, 1);
    }

    onSelectorClick = changeAmount => {
        this.setState({
            current: this.state.current + changeAmount,
        })
    }

    render() {
        return (
            <div>
                <button
                    onClick={this.onPrevSelectorClick}
                    disabled={this.state.current === this.props.min}>
                    {'prev'}
                </button>
                <span>
                    {this.state.current}
                </span>
                <button
                    onClick={this.onNextSelectorClick}
                    disabled={this.state.current === this.props.max}>
                    {'next'}
                </button>
            </div>
        )
    }
}

class App extends React.Component {
    render() {
        return (
            <Navigator />
        )
    }
}
```

위 코드에서 `Navigator`의 `render()`를 보면, `this.state.current`로 현재 상태를 노출해주고 있고 `<button>` element에 관련된 `onClick`, `disabled` 등의 props를 넣어 selector 역할을 하는 버튼을 렌더링해주고 있다. 여기서 좀 더 재사용성을 고려한 코드를 작성하기 위해 고민을 해보면, `<button>`엘리먼트나 `this.state.current`를 노출하는 부분에 다른 component를 사용하게끔 하는 방법을 생각해볼 수 있겠다. 이와 같이 동작하도록 render props를 이용해 코드를 다시 작성해보면 아래와 같다.

```js
class Navigator extends React.Component {
    static propTypes = {
        default: PropTypes.number,
        min: PropTypes.number,
        max: PropTypes.number,
        children: PropTypes.func.isRequired,
    }

    static defaultProps = {
        default: 0,
        min: 0,
        max: 10,
    }

    constructor(props) {
        super(props);

        this.state = {
            current: this.props.default,
        }

        this.onPrevSelectorClick = this.onSelectorClick.bind(null, -1);
        this.onNextSelectorClick = this.onSelectorClick.bind(null, 1);
    }

    onSelectorClick = changeAmount => {
        this.setState({
            current: this.state.current + changeAmount,
        })
    }

    // prev selector에 필요한 props들을 불러온다.
    getPrevSelectorProps = () => ({
        onClick: this.onPrevSelectorClick,
        disabled: this.state.current === this.props.min,
    })

    // next selector에 필요한 props들을 불러온다.
    getNextSelectorProps = () => ({
        onClick: this.onNextSelectorClick,
        disabled: this.state.current === this.props.max,
    })

    render() {
        // children props로 받은 함수를 render props로 사용
        const renderProps = this.props.children;

        // render props에 렌더링에 필요한 값들을 function props로 넣어주며 렌더링
        return renderProps({
            current: this.state.current,
            prevSelectorProps: this.getPrevSelectorProps(),
            nextSelectorProps: this.getNextSelectorProps(),
        })
    }
}

class App extends React.Component {
    render() {
        return (
            // Navigator의 children으로 selector와 현재 상태를 보여줄 component를 반환하는 function을 넣어준다.
            // 반환되는 component는 render prop 렌더링시 넣어준 function props를 사용 하고 있다.
            <Navigator>
                {({
                    current,
                    prevSelectorProps,
                    nextSelectorProps,
                }) =>
                    (
                        <div>
                            <button {...prevSelectorProps}>
                                {'prev'}
                            </button>
                            <span>
                                {current}
                            </span>
                            <button {...nextSelectorProps}>
                                {'next'}
                            </button>
                        </div>
                    )
                }
            </Navigator>
        )
    }
}
```

이제 `Navigator` 내부의 selector나 현재 상태가 노출되는 부분에 다른 component를 사용할 수 있고 조건문 등을 이용하여 동적으로 렌더링이 가능해졌다.

이와 같이, render prop를 사용하면 어떠한 공통된 동작이나 상태들을 캡슐화하고 동적으로 component에 해당 값들을 입혀 렌더링을 할 수 있다.

하지만 이 코드에는 치명적인 문제점이 있다. 만약 `<button onClick={this.handleClick} {...prevSelectorProps}>` 와 같이 내부 button element에 `onClick` 이벤트 핸들러를 추가로 등록한다고 가정해보자. `Navigator`에서 `prevSelectorProps`를 불러오는 `getPrevSelectorProps`를 다시 살펴보면 다음과 같다.

```js
// prev selector에 필요한 props들을 불러온다.
getPrevSelectorProps = () => ({
    onClick: this.onPrevSelectorClick,
    disabled: this.state.current === this.props.min,
})
```

여기서 포함되어있는 `onClick` props로 인해 button element에 인라인으로 넣어준 `onClick` 이벤트 핸들러는 override 될 것이다. 이로 인해 `Navigator` component는 개발자가 의도하지 않은 동작을 실행하게 될 수도 있다. 이같은 오류는 props getter와 같은 패턴을 적용함으로써 해결할 수 있다.

### prop getters
prop getters 패턴에선 render callback에 function props로 object가 아닌 function을 넣어준다. prop getters를 적용하여 다시 작성한 `Navigator` 코드를 살펴보자.

```js
const callAll = (...fns) => (...args) => fns.forEach(fn => fn && fn(...args));

class Navigator extends React.Component {
    static propTypes = {
        default: PropTypes.number,
        min: PropTypes.number,
        max: PropTypes.number,
        children: PropTypes.func.isRequired,
    }

    static defaultProps = {
        default: 0,
        min: 0,
        max: 10,
    }

    constructor(props) {
        super(props);

        this.state = {
            current: this.props.default,
        }

        this.onPrevSelectorClick = this.onSelectorClick.bind(null, -1);
        this.onNextSelectorClick = this.onSelectorClick.bind(null, 1);
    }

    onSelectorClick = changeAmount => {
        this.setState({
            current: this.state.current + changeAmount,
        })
    }

    // prev selector의 prop getter
    getPrevSelectorProps = (ownProps = {}) => ({
        disabled: this.state.current === this.props.min,
        ...ownProps,    // ownProps와 함께 구성
        onClick: callAll(ownProps.onClick, this.onPrevSelectorClick),   // ownProps로 넘겨진 onClick handler도 함께 실행되도록 함
    })

    // next selector의 prop getter
    getNextSelectorProps = (ownProps = {}) => ({
        disabled: this.state.current === this.props.max,
        ...ownProps,    // ownProps와 함께 구성
        onClick: callAll(ownProps.onClick, this.onNextSelectorClick),   // ownProps로 넘겨진 onClick handler도 함께 실행되도록 함
    })

    render() {
        // children props로 받은 함수를 render props로 사용
        const renderProps = this.props.children;

        // render props에 렌더링에 필요한 값들을 function props로 넣어주며 렌더링
        return renderProps({
            current: this.state.current,
            getPrevSelectorProps: this.getPrevSelectorProps,
            getNextSelectorProps: this.getNextSelectorProps,
        })
    }
}
```

눈여겨봐야할 부분은 `getPrevSelectorProps()`와 `getNextSelectorProps()`의 달라진 구현 내용과 `render()`에서 render callback에 function props로 어떤값을 넘겨주고 있는가이다.

```js
getPrevSelectorProps = (ownProps = {}) => ({
    disabled: this.state.current === this.props.min,
    ...ownProps,    // ownProps와 함께 구성
    onClick: callAll(ownProps.onClick, this.onPrevSelectorClick),   // ownProps로 넘겨진 onClick handler도 함께 실행되도록 함
})
```

`getPrevSelectorProps()`를 구현 내용을 보면 `ownProps` 인자로 받아 `Navigator`에 필요한 기존 props들과 함께 구성하고 있다. 또한 `onClick`에는 기존 핸들러와 `ownProps`로 넘겨진 `onClick`핸들러를 `callAll()`로 묶어주고 있다. `callAll()`은 인자로 넘겨진 function들을 차례로 실행해주는 util function이다.

```js
render() {
    // children props로 받은 함수를 render props로 사용
    const renderProps = this.props.children;

    // render props에 렌더링에 필요한 값들을 function props로 넣어주며 렌더링
    return renderProps({
        current: this.state.current,
        getPrevSelectorProps: this.getPrevSelectorProps,
        getNextSelectorProps: this.getNextSelectorProps,
    })
}
```

다음 `render()`를 살펴 보면, render callback의 function props로 일반 object를 넘겨주던 이전 코드와는 달리 `this.getPrevSelectorProps`, `this.getNextSelectorProps`와 같은 function을 넘겨주고 있다. 이것들이 곧 prop getter이며, render callback에 필요한 props를 적절하게 가져올 수 있도록 도와준다.

아래는 prop getters 패턴이 적용된 `Navigator`를 사용하는 예시이다.

```js
<Navigator>
    {({
        current,
        getPrevSelectorProps,
        getNextSelectorProps,
    }) =>
        (
            <div>
                <button {...getPrevSelectorProps({
                    onClick() {
                        console.log('Prev Selector Clicked!');
                    }
                })}>
                    {'prev'}
                </button>
                <span>
                    {current}
                </span>
                <button {...getNextSelectorProps({
                    onClick() {
                        console.log('Next Selector Clicked!');
                    }
                })}>
                    {'next'}
                </button>
            </div>
        )
    }
</Navigator>
```

`getPrevSelectorProps`와 `getNextSelectorProps`를 props로 받아 임의로 추가된 `onClick` 핸들러를 넣어주고 실행하여 반환되는 값으로 props를 넣어주고 있다. 이제 custom `onClick` 이벤트를 추가로 넣어도 override되지 않고 사용자 의도대로 동작 가능한 `Navigator`를 구현할 수 있게 되었다. 이와 같이 render props와 prop getters를 적절하게 이용하면 렌더링 관심사를 사용자에게로 분리하여 공통 핵심 로직에 집중한 component를 구현할 수 있다.

## 참고
* [https://reactjs.org/docs/higher-order-components.html](https://reactjs.org/docs/higher-order-components.html)
* [https://reactjs.org/docs/render-props.html](https://reactjs.org/docs/render-props.html)
* [https://cdb.reacttraining.com/use-a-render-prop-50de598f11ce](https://cdb.reacttraining.com/use-a-render-prop-50de598f11ce)
* [https://blog.kentcdodds.com/how-to-give-rendering-control-to-users-with-prop-getters-549eaef76acf](https://cdb.reacttraining.com/use-a-render-prop-50de598f11ce)