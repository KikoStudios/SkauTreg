from openpyxl import Workbook
from pathlib import Path

wb = Workbook()
ws = wb.active
ws.title = "Clenove"

headers = [
    "Celé jméno",
    "Nick",
    "Rok narození",
    "Jméno rodiče",
    "Tel.",
    "E-mail",
    "Poznámka",
]
ws.append(headers)

rows = [
    ["Jan Novák", "Honza", "2011", "Petr Novák", "+420 777 111 222", "jan.novak@example.com", "alergie na ořechy"],
    ["Eliška Malá", "Eli", "2013", "Marie Malá", "+420 606 333 444", "eliska.mala@example.com", ""],
    ["Tomáš Dvořák", "Tom", "2010", "Jana Dvořáková", "+420 777 555 666", "tomas.dvorak@example.com", ""],
    ["Karolína Svobodová", "Kája", "2012", "Radek Svoboda", "+420 602 777 888", "kaja.svobodova@example.com", ""],
    ["Matěj Král", "Mates", "2014", "Ivana Králová", "+420 777 999 000", "matej.kral@example.com", ""],
    ["Tereza Černá", "Teri", "2011", "Milan Černý", "+420 608 111 333", "tereza.cerna@example.com", ""],
    ["Adam Procházka", "Ady", "2015", "Lucie Procházková", "+420 777 222 333", "adam.prochazka@example.com", ""],
    ["Natálie Veselá", "Naty", "2012", "Ondřej Veselý", "+420 602 444 555", "natalie.vesela@example.com", ""],
    ["Filip Kučera", "Filda", "2010", "Roman Kučera", "+420 777 666 777", "filip.kucera@example.com", ""],
    ["Klára Horáková", "Klara", "2013", "Pavla Horáková", "+420 603 888 999", "klara.horakova@example.com", ""],
]

for row in rows:
    ws.append(row)

out_path = Path("mock-members-import.xlsx")
wb.save(out_path)
print(out_path.resolve())
