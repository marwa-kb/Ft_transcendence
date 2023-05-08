# ft_transcendence

#### About dockerize

(This is temp information, probably delete when everybody get used to it or don't even use it, lol)

I only tested in MacOS, school Linux dump. I can't say about Windows or dual boot, etc.

We have 3 docker containers: backend, frontend, db.
Currently we use it in the development stage. But I added a production build as well.

## Usage

#### 0. Prod version
```python
./prod_up.sh
```
### For development environment
#### 1. Start the app
The script is running ```npm i``` in frontend and backend, then executes ```docker compose up -d```.
```python
./start.sh
```
#### 2. Debugging backend: there is 2 possibilities:
    
- Debug in VScode, execute 
  - ```python
    docker logs -f backend
    ```

- Use ```chrome://inspect``` in browser. I opened 1 port debugging : ```9229```. [Here](https://blog.risingstack.com/how-to-debug-a-node-js-app-in-a-docker-container/) is the information how to set it up.
(I'm not an expert in this so I use first option, lol)

#### 3. Debugging frontend:
- Debug in VScode, execute 
  - ```python
    docker logs -f frontend
    ```
#### 4. Prisma studio: 
As previous : ```http://localhost:5555```

#### 5. Lastly, if I don't wanna use Docker?
You can use it as previous without any docker containers, but you need to execute many commands as previous (npm, npx, etc)😊
