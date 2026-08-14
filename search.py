import os,requests
from dotenv import load_dotenv
load_dotenv()
BASE="https://test.api.amadeus.com"
def token():
    cid=os.getenv("AMADEUS_CLIENT_ID"); secret=os.getenv("AMADEUS_CLIENT_SECRET")
    if not cid or not secret: raise RuntimeError("Missing Amadeus credentials")
    r=requests.post(BASE+"/v1/security/oauth2/token",data={"grant_type":"client_credentials","client_id":cid,"client_secret":secret},timeout=20); r.raise_for_status(); return r.json()["access_token"]
def flights_search(origin,destination,departure,return_date,adults):
    t=token(); p={"originLocationCode":origin.upper(),"destinationLocationCode":destination.upper(),"departureDate":departure,"adults":adults,"currencyCode":"USD","max":50}
    if return_date:p["returnDate"]=return_date
    r=requests.get(BASE+"/v2/shopping/flight-offers",headers={"Authorization":"Bearer "+t},params=p,timeout=30); r.raise_for_status()
    out=[]
    for o in r.json().get("data",[]):
        it=o.get("itineraries",[])
        if not it: continue
        s=it[0]["segments"]; first=s[0]; last=s[-1]
        out.append({"airline":o.get("validatingAirlineCodes",["?"])[0],"origin":first["departure"]["iataCode"],"destination":last["arrival"]["iataCode"],"departure":first["departure"].get("at",""),"arrival":last["arrival"].get("at",""),"stops":sum(max(0,len(i["segments"])-1) for i in it),"price":float(o["price"]["grandTotal"])})
    return out
def city_code(city):
    t=token(); r=requests.get(BASE+"/v1/reference-data/locations",headers={"Authorization":"Bearer "+t},params={"subType":"CITY","keyword":city,"page[limit]":5},timeout=20); r.raise_for_status()
    d=r.json().get("data",[])
    if not d: raise RuntimeError("City not found")
    return d[0]["iataCode"]
def hotels_search(city,checkin,checkout,guests,rooms):
    t=token(); code=city_code(city)
    r=requests.get(BASE+"/v1/reference-data/locations/hotels/by-city",headers={"Authorization":"Bearer "+t},params={"cityCode":code,"radius":30,"radiusUnit":"KM","hotelSource":"ALL"},timeout=30); r.raise_for_status()
    ids=",".join(x["hotelId"] for x in r.json().get("data",[])[:40])
    if not ids:return []
    r=requests.get(BASE+"/v3/shopping/hotel-offers",headers={"Authorization":"Bearer "+t},params={"hotelIds":ids,"checkInDate":checkin,"checkOutDate":checkout,"adults":guests,"roomQuantity":rooms,"currency":"USD"},timeout=40); r.raise_for_status()
    out=[]
    for x in r.json().get("data",[]):
        h=x.get("hotel",{}); offers=x.get("offers",[])
        if not offers:continue
        try: price=float(offers[0]["price"]["total"])
        except:continue
        out.append({"name":h.get("name","Hotel"),"rating":float(h.get("rating") or 0),"reviews":0,"price":price,"breakfast":False,"free_cancel":False,"lat":h.get("latitude"),"lon":h.get("longitude")})
    return out
