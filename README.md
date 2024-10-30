# UniNowStudentService_v2
## UniNowStudentService 2.0

Der UniNowStudentService ermöglicht den Abruf von Informationen zu Studierenden aus HISinOne zur Realisierung des digitalen Studierendenausweises sowie der European Student Card (ESC) in der UniNow-App.

### Neue Features in der Version 2.0 sind:
- **Erweiterte Aufruf-Parameter**, die eine granulare Steuerung des übermittelten Datensatzumfanges ermöglichen:
  - `registrationnumber`: Standard-Parameter zur Auswahl des Studierenden über die Matrikelnummer (zwingend)
  - `withEmailAddress`: Zusatz-Parameter zur Festlegung, ob die studentische E-Mail-Adresse zurückübermittelt werden soll (freiwillig; erforderlich für die European Student Card; Standard: false)
  - `withStudentStatus`: Zusatz-Parameter zur Festlegung, ob der Studenten-Status (Haupthörer, Zweithörer, Gasthörer etc.) zurückübermittelt werden soll (freiwillig; Standard: false)
  - `withCourseOfStudy`: Zusatz-Parameter zur Festlegung, ob die/der Studiengänge der Einschreibung (z.B. Betriebswirtschaftslehre, Maschinenbau etc.) zurückübermittelt werden sollen (freiwillig; Standard: false)
  - `withDegree`: Zusatz-Parameter zur Festlegung, ob der angestrebte Abschluss auf Studiengang-Ebene (z.B. Bachelor, Master) zurückübermittelt werden soll (freiwillig; Standard: false)
  - `lang`: Zusatz-Parameter zur Festlegung, in welcher Sprache die Daten aus HISinOne ermittelt werden sollen (freiwillig; Standard: "DE", alternativ: "EN")

Werden die bereitgestellten Dateien in `/WEB-INF/conf/hisservices/` bzw. `/WEB-INF/conf/hisservices/scripts/` der HISinOne-Installation hinterlegt und der Webservice generiert, so kann die UniNow-App diese Daten unter Verwendung eines berechtigten Benutzers abrufen.
