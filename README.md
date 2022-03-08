# explorer-api

example https://poolexplorer.xyz/draw140
```
    n: network (eth=1 poly=3 avax=4)
    a: user address
    c: array of prizes claimable
    u: array of prizes unclaimable
    b: normalized balance
    w: sum of prizes claimable
    d: sum of prizes dropped
    g: users average balance
```          
example https://poolexplorer.xyz/player?address=0xc8f7c0dc39c8f736e8d9ffd85c4adcb3c7a4bf37
```
    query: select network,address,draw_id,claimable_prizes from prizes where address = <address>

    returns array of players history, example

    {"network":"polygon","address":{"type":"Buffer","data":[200,247,192,220,57,200,247,54,232,217,255,216,92,74,220,179,199,164,191,55]},"draw_id":87,"claimable_prizes":["999999991183333","99999999921875"]}  
```
