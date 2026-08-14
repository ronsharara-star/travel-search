import requests
def convert(amount,frm="USD",to="ILS"):
    if frm==to:return round(float(amount),2)
    rates={"USD":1,"ILS":3.2,"THB":32,"EUR":.86,"GBP":.74,"JPY":147,"CAD":1.38,"AUD":1.52,"CHF":.79,"SGD":1.28}
    try:
        r=requests.get("https://api.frankfurter.app/latest",params={"amount":amount,"from":frm,"to":to},timeout=8); r.raise_for_status()
        return round(float(r.json()["rates"][to]),2)
    except:return round(float(amount)*rates.get(to,1)/rates.get(frm,1),2)
