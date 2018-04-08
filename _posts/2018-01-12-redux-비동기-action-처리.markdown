---
layout: post
title:  "redux 비동기 action 처리"
---
## action
* redux에서 state의 변경을 일으키는 이벤트를 의미
* javascript pure object로 표현됨

## 비동기 action
* 대표적으로 data fetch
* 어떠한 작업이 완료되기를 기다렸다가(`Promise`) 특정 action을 dispatch
* 어떤 action이 dispatch 되기를 기다렸다가 또 다른 action을 dispatch

## 비동기 처리를 어떻게 다룰 것인가
### With [redux-thunk](https://github.com/gaearon/redux-thunk)

> actionCreator가 비동기적으로 action을 dispatch하는 함수를 반환 할 수 있다면?

* thunk란?
    * 어떠한 표현식의 evaluation을 지연시키기 위해서 wrapping한 함수
        * https://github.com/gaearon/redux-thunk#whats-a-thunk

        ```javascript
        // calculation of 1 + 2 is immediate
        // x === 3
        let x = 1 + 2;

        // calculation of 1 + 2 is delayed
        // foo can be called later to perform the calculation
        // foo is a thunk!
        let foo = () => 1 + 2;
        ```
* `redux-thunk`가 하는일
    * pure javascript object 형태로 action을 반환하던 actionCreator에서 함수로 래핑한 형태로 반환 가능하게 함
    * actionCreator가 함수를 반환하는데, 이 함수는 `dispatch`와 `getState`를 파라미터로 갖고 내부에서 비동기적으로 action을 dispatch 가능

    ```javascript
    const INCREMENT_COUNTER = 'INCREMENT_COUNTER';

    function increment() {
        return {
            type: INCREMENT_COUNTER
        };
    }

    function incrementAsync() {
        return dispatch => {
            setTimeout(() => {
            // Yay! Can invoke sync or async actions with `dispatch`
            dispatch(increment());
            }, 1000);
        };
    }
    ```
* `redux-thunk`에 대한 좀 더 심층적인 설명
    * [참고](http://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559)

* 좀 더 복잡한 비동기 처리에 대한 고민
    * non-blocking 호출
    * 동시성 처리
        * ex) 여러 비동기 어떤 action에 대한 비동기적인 응답이 완료되지 않았을때 새로운 action이 dispatch 되면 어떻게 처리해야하나?

### With [redux-saga](https://github.com/redux-saga/redux-saga)

> action들의 처리를 하나의 task로 정의하고, 그 task에 추상화된 effect를 이용하여 서술적으로 구현할 수 있다면?

* redux-saga
    * 애플리케이션에서 사이드 이펙트만을 담당하는 별도의 쓰레드(같은 것?)가 존재 -> saga
    * `redux-saga`는 `redux`의 middleware로써 어떠한 action에 의해 saga가 실행, 정지, 취소 등의 동작을 할 수 있게 함
    * saga내에서 state 접근, 또 다른 action의 dispatch 역시 가능
* [generator function(`function*`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)
    ```javascript
    function* name([param[, param[, ... param]]]) {
        statements
    }
    ```
    * generator function 호출시 즉시 실행 되지 않고 함수를 위한 iterator object가 반환
    * iterator의 `next()` method가 실행되면 `yield` keyword를 포함한 표현식을 만날 때까지 진행되고 해당 표현식이 가리키는 값이 반환
    * 또 다시 `next()` method가 호출되면 정지했던 부분부터 다시 `yield` 표현식으로 만날때까지 실행

    ```javascript
    function* idMaker(){
        var index = 0;
        while(index < 3)
            yield index++;
    }

    var gen = idMaker();

    console.log(gen.next().value); // 0
    console.log(gen.next().value); // 1
    console.log(gen.next().value); // 2
    console.log(gen.next().value); // undefined
    // ...
    ```

    * saga task는 위와 같은 generator function으로 구현됨
* 여러가지 effect(saga를 서술 하기 위한 도구)
    * `select`: state로부터 필요한 데이터를 꺼낸다.
    * `put`: action을 dispatch한다.
    * `take`: action을 기다린다. 이벤트의 발생을 기다린다.
    * `call`: Promise의 완료를 기다린다.
    * `fork`: 다른 task를 시작한다.
    * `join`: 다른 task의 종료를 기다린다.
    * ...

* `redux-saga`를 이용한 비동기 처리 예제
    * api 호출
        ```javascript
        import { fork, take, call, put } from 'redux-saga/effects'
        // ...

        function* fetchData(action) {
            while(true) {
                const action = yield take("FETCH_REQUESTED");  // 2. take effect로 FETCH_REQUESTED action을 기다림
                try {
                    const data = yield call(Api.fetchUser, action.payload.url);  // 3. FETCH_REQUEST action이 dispatch 된 후 call effect로 Api.fetchUser 함수를 통해 api 호출, 응답을 기다림
                    yield put({type: "FETCH_SUCCEEDED", data})  // 4-1. 호출 응답이 성공적으로 완료 되면 put effect로 FETCH_SUCCEEDED action을 dispatch
                } catch (error) {
                    yield put({type: "FETCH_FAILED", error}) // 4-2. 호출 응답이 실패하면 put effect로 FETCH_FAILED action을 dispatch
                }
            }
        }

        export default function* rootSaga() {
            yield fork(fetchData);  // 1. fork effect로 fetchData Task 시작
        }        
        ```

    * 동시성 처리
        ```javascript
        import { fork, take, call, put, cancel } from 'redux-saga/effects'
        // ...

        function* callApi(action) {
            try {
                const data = yield call(Api.fetchUser, action.payload.url);  // 5. call effect로 Api.fetchUser 함수를 통해 api 호출, 응답을 기다림
                    yield put({type: "FETCH_SUCCEEDED", data})  // 6-1. 호출 응답이 성공적으로 완료 되면 put effect로 FETCH_SUCCEEDED action을 dispatch
            } catch (error) {
                yield put({type: "FETCH_FAILED", error}) // 6-2. 호출 응답이 실패하면 put effect로 FETCH_FAILED action을 dispatch
            }
        }

        function* fetchData(action) {
            let lastTask;
            while(true) {
                const action = yield take("FETCH_REQUESTED");  // 2. take effect로 FETCH_REQUESTED action을 기다림
                if (lastTask) {
                    yield cancel(lastTask);  // 3. FETCH_REQUESTED action이 완료 되고 (아직 완료되지 않은 task가 있다면) cancel effect로 해당 task를 취소
                }
                lastTask = yield fork(callApi, action);  // 4. fork effect로 callApi task를 실행
            }
        }

        export default function* rootSaga() {
            yield fork(fetchData);  // 1. fork effect로 fetchData Task 시작
        }        
        ```        

* 고수준으로 추상화된 helper 함수도 제공
    * `takeEvery`, `takeLatest`, ...
    * 헬퍼함수를 사용한 동시성 처리 예제
        ```javascript
        import { call, put, takeLatest } from 'redux-saga/effects'
        // ...

        function* fetchData(action) {
            while(true) {
                try {
                    const data = yield call(Api.fetchUser, action.payload.url);  // 2. FETCH_REQUEST action이 dispatch 된 후 call effect로 Api.fetchUser 함수를 통해 api 호출, 응답을 기다림
                    yield put({type: "FETCH_SUCCEEDED", data})  // 3-1. 호출 응답이 성공적으로 완료 되면 put effect로 FETCH_SUCCEEDED action을 dispatch
                } catch (error) {
                    yield put({type: "FETCH_FAILED", error}) // 3-2. 호출 응답이 실패하면 put effect로 FETCH_FAILED action을 dispatch
                }
            }
        }

        export default function* rootSaga() {
            yield takeLatest("FETCH_REQUEST", fetchData);  // 1. FETCH_REQUEST action을 기다린다. task가 아직 완료 되지 않았을 경우 기존 task를 취소하고 새로운 task를 시작한다.
        }        
        ```

* 그 외 `redux-saga`를 이용하여 처리 가능한(할 것 같은..) 구현들
    * api 호출 retry
    * api 요청 throttling
    * ...

* Test
    * TODO

## 참고
* [http://redux.js.org/docs/advanced/AsyncActions.html](http://redux.js.org/docs/advanced/AsyncActions.html)
* [https://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559](https://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559)
* [https://redux-saga.js.org/](https://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559)
* [https://github.com/reactkr/learn-react-in-korean/blob/master/translated/deal-with-async-process-by-redux-saga.md](https://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559)

