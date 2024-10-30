var sharedLogger = hisinone.getLogger("UniNowStudentService/readStudentWithCoS-script");

/******************************************************************************************
Used web service methods (+ rights):

StudentService201812.readStudentByPersonId:   cm.stu.student.VIEW_STUDENT_DATA
StudentService201812.findStudent:             cm.stu.student.VIEW_STUDENT_DATA
PersonService.readPerson201806:               cs.psv.person.VIEW_PERSON_MAINDATA
RightsAndRolesService.findOrgRole60:          cs.psv.person.VIEW_PERSON_RIGHTSROLES
PersonAddressService.findEaddress:            cs.psv.person.VIEW_ADDRESSES
KeyvalueService.getAll:                       cs.sys.core.VIEW_KEYTABLE
PeriodService.getActivePeriodDtoByType:       RIGHT_EVERYONE
CourseOfStudyService.getCourseOfStudyById:    RIGHT_EVERYONE

Webservices usage:                            cs.sys.ws.USE
*******************************************************************************************/

/* webservices ****************************************************************************/

var studentService = hisinone.getInternalWebservice("StudentService201812");
var personService = hisinone.getInternalWebservice("PersonService");
var rightsAndRolesService = hisinone.getInternalWebservice("RightsAndRolesService");
var valueService = hisinone.getInternalWebservice("KeyvalueService");
var periodService = hisinone.getInternalWebservice("PeriodService");
var courseOfStudyService = hisinone.getInternalWebservice("CourseOfStudyService");
var personAddressService = hisinone.getInternalWebservice("PersonAddressService");

/* constants ******************************************************************************/
const ROLE_HISKEY_IDS = {
    STUDENT: 5,
    AUDITOR: 8
};
const PERIOD_SZ_HISKEY_ID = 7;     // HIS: SZ/ Gesamter Semesterzeitraum

const RZ_EMAIL_ADDRESSTAG = "rz";  // HIS: The addresstag for data-center-e-mail-addresses (Rechenzentrums-E-Mail-Adressen)

// log
sharedLogger.debug("UniNowStudentService");

// determine the actual semester period
var actualSemesterPeriod = getActualSemesterPeriod();

// log
sharedLogger.debug("Determined the actual semester period in JSON-format: " + JSON.stringify(actualSemesterPeriod, null, 2));

// extract the tegistrationnumber from the current request
var registrationnumber = idAsStringOrNull(request.longValue("registrationnumber"));
// log
sharedLogger.debug("Registrationnumber extracted from request=" + registrationnumber);

var withEmailAddress = request.booleanValue("withEmailAddress");
// log
sharedLogger.debug("withEmailAddress extracted from request=" + withEmailAddress);

var withStudentStatus = request.booleanValue("withStudentStatus");
// log
sharedLogger.debug("withStudentStatus extracted from request=" + withStudentStatus);

var withCourseOfStudy = request.booleanValue("withCourseOfStudy");
// log
sharedLogger.debug("withCourseOfStudy extracted from request=" + withCourseOfStudy);

var withDegree = request.booleanValue("withDegree");
// log
sharedLogger.debug("withDegree extracted from request=" + withDegree);

var lang = (request.stringValue("lang") + "").toString();
// log
sharedLogger.debug("Language extracted from request=" + lang);

// make lang toUpper
lang = lang.toUpperCase();

// Check if lang is empty string
if (lang == "") {
    // If empty string, assign "DE" (default)
    lang = "DE";

    // log
    sharedLogger.debug("Language set to default=" + lang);
}

// translate period (semester) if applicable)
if (lang == "EN") {
    // retrieve translations via KeyvalueService and replace on object
    var periodsKeyvalue = getAllPeriods(lang);
    var periodKeyvalue = periodsKeyvalue.byId[actualSemesterPeriod.id];
    actualSemesterPeriod.shorttext = periodKeyvalue.shorttext;
    actualSemesterPeriod.defaulttext = periodKeyvalue.defaulttext;
    actualSemesterPeriod.longtext = periodKeyvalue.longtext;

    // log
    sharedLogger.debug("Translated the actual semester period which is now in JSON-format: " + JSON.stringify(actualSemesterPeriod, null, 2));
}

// determine the personId by the registrationnumber
var personId = findPersonIdByRegistrationnumber(registrationnumber);

// log
sharedLogger.debug("PersonId determined for the provided registrationnumber=" + personId);

if(personId == 0) {
	// No student has been found, so return empty response.
	return null;
}

// determine the person main data
var personMainData = findMainDataByPersonId(personId, withEmailAddress);

// log
sharedLogger.debug("Determined person main data in JSON-format:" + JSON.stringify(personMainData, null, 2));

var studentAuditor = isStudentAuditor(personId);

// log
sharedLogger.debug("Is student/auditor=" + studentAuditor);


if(studentAuditor) {
    // determine the student main data in case the person is student/auditor
    var studentMainData = findStudentDataByPersonId(personId, withStudentStatus, withCourseOfStudy, withDegree, lang);

    // log
    sharedLogger.debug("Determined student main data in JSON-format:" + JSON.stringify(studentMainData, null, 2));

} else {

    // log
    sharedLogger.debug("No student main data determined as no student/auditor");
}

// construct the result object
  var result = {
    "registrationnumber" : registrationnumber,
    "actualsemesterperiod" : flattenPeriod(actualSemesterPeriod),
    "personmaindata" : personMainData,
    "studentmaindata" : studentMainData
};

// log
sharedLogger.debug("Total result in JSON-format:" + JSON.stringify(result, null, 2));

// return result
return result;

/* functions of this script ****************************************************************/

/* utilities *******************************************************************************/

/* converts the passed date to iso date ****************************************************/
function toIsoDate(date) {
        if (!date) {
                return null;
        }

        var month = date.getMonth() + 1;
        if (month < 10) {
                month = "0" + month;
        }

        var day = date.getDate();
        if (day < 10) {
                day = "0" + day;
        }

        return (date.getFullYear() + "-" + month + "-" + day).toString();
}

/* converts the passed object to string or null ********************************************/
function idAsStringOrNull(obj) {
        if (obj == null) {
                return null;
        }

        return (obj + "").toString(); // implicit conversion
}

/* constructors for internal objects *******************************************************/

/* constructor for Period ******************************************************************/
function Period(id, uniquename, shorttext, defaulttext, longtext, year, startdate, enddate) {
        this.id = id;
        this.uniquename = uniquename;
        this.shorttext = shorttext;
        this.defaulttext = defaulttext;
        this.longtext = longtext;
        this.year = year;
        this.startdate = startdate;
        this.enddate = enddate;
}

/* constructor for DegreeProgramProgress ***************************************************/
function DegreeProgramProgress(id, periodId, startdate, enddate, finished, studentstatus, courseOfStudy) {
        this.id = id;
        this.periodId = periodId;
        this.startdate = startdate;
        this.enddate = enddate;
        this.finished = finished;
        this.studentstatus = studentstatus;
        this.courseOfStudy = courseOfStudy;
}

/* constructor for CourseOfStudy ************************************************************/
function CourseOfStudy(id, shorttext, defaulttext, longtext, degree) {
        this.id = id;
        this.shorttext = shorttext;
        this.defaulttext = defaulttext;
        this.longtext = longtext;
        this.degree = degree;
}

/* constructor for Degree ******************************************************************/
function Degree(id, shorttext, defaulttext, longtext) {
        this.id = id;
        this.shorttext = shorttext;
        this.defaulttext = defaulttext;
        this.longtext = longtext;
}

/* function to flatten Period to JSON-format for return *****************************/
function flattenPeriod(period) {

        // log
        sharedLogger.debug("flattenPeriod");

        const flattenedData = {
                "id": period.id,
                "uniquename": period.uniquename,
                "shorttext":period.shorttext,
                "defaulttext": period.defaulttext,
                "longtext": period.longtext,
                "year": period.year,
                "startdate": period.startdate,
                "enddate": period.enddate
        };

        // log
        sharedLogger.debug("Determined Period in JSON-format:" + JSON.stringify(flattenedData, null, 2));

        return flattenedData;

}

/* function to flatten Studentstatus to JSON-format for return *****************************/
function flattenStudentstatus(studentstatus) {

        // log
        sharedLogger.debug("flattenStudentstatus");
		
		if (studentstatus == null) {
			return null;
		}

        const flattenedData = {
                "id": studentstatus.id,
                "uniquename": studentstatus.uniquename,
                "shorttext": studentstatus.shorttext,
                "defaulttext": studentstatus.defaulttext,
                "longtext": studentstatus.longtext
        };

        // log
        sharedLogger.debug("Determined Studentstatus in JSON-format:" + JSON.stringify(flattenedData, null, 2));

        return flattenedData;

}

/* function to flatten Degree to JSON-format for return ************************************/
function flattenDegree(degree) {

        // log
        sharedLogger.debug("flattenDegree");
		
		if (degree === null) {
			return null;
		}

        const flattenedData = {
                "id": degree.id,
                "shorttext": degree.shorttext,
                "defaulttext": degree.defaulttext,
                "longtext": degree.longtext
        };

        // log
        sharedLogger.debug("Determined Degree in JSON-format: " + JSON.stringify(flattenedData, null, 2));

        return flattenedData;
}

/* function to flatten CourseOfStudy to JSON-format for return *****************************/
function flattenCourseOfStudy(coS) {

        // log
        sharedLogger.debug("flattenCourseOfStudy");
		
		if (coS === null) {
			return null;
		}

        const flattenedData = {
                "id": coS.id,
                "periodid": coS.periodid,
                "shorttext": coS.shorttext,
                "defaulttext": coS.defaulttext,
                "longtext": coS.longtext,
                "degree" : flattenDegree(coS.degree)
        };

        // log
        sharedLogger.debug("Determined CourseOfStudy in JSON-format: " + JSON.stringify(flattenedData, null, 2));

        return flattenedData;
}

/* function to flatten DegreeProgramProgresses to JSON-format for return *******************/
function flattenDPPs(dpps) {

        // log
        sharedLogger.debug("flattenDPPs");

        const flattenedData = {
                "degreeprogramprogresses": dpps.map((dpp) => ({
                "id": dpp.id,
                "periodid" : dpp.periodId,
                "startdate": dpp.startdate,
                "enddate": dpp.enddate,
                "finished": dpp.finished,
                "studentstatus": flattenStudentstatus(dpp.studentstatus),
                "courseofstudy": flattenCourseOfStudy(dpp.courseOfStudy)
            }))
        };

        sharedLogger.debug("Determined DegreeProgramProgresses in JSON-format: " + JSON.stringify(flattenedData, null, 2));

        return flattenedData;
}


/* functions to query "value-classes" *******************************************************/

/* function to query value-class "StudentstatusValue" ***************************************/
function getAllStudentstatus(lang) {
        function Studentstatus(id, uniquename, shorttext, defaulttext, longtext) {
                this.id = id;
                this.uniquename = uniquename;
                this.shorttext = shorttext;
                this.defaulttext = defaulttext;
                this.longtext = longtext;
        }
        var result = {
                "byUniquename" : {}
        };

        var allStudentstatusResponse = valueService.call("getAll", {
                "valueClass" : "StudentstatusValue",
                "lang" : lang
        });
        var values = allStudentstatusResponse.xpathList("values/value");
        for (var i=0; i<values.size(); i++) {
                var value = values.get(i);
                var studentstatus = new Studentstatus(
                        idAsStringOrNull(value.longValue("id")),
                        (value.stringValue("uniquename") + "").toString(),
                        (value.stringValue("shorttext") + "").toString(),
                        (value.stringValue("defaulttext") + "").toString(),
                        (value.stringValue("longtext") + "").toString()
                );

                result.byUniquename[studentstatus.uniquename] = studentstatus;
        }

        return result;
}

/* function to query value-class "Degree" ***************************************************/
function getAllDegrees(lang) {
        function Degree(id, shorttext, defaulttext, longtext) {
                this.id = id;
                this.shorttext = shorttext;
                this.defaulttext = defaulttext;
                this.longtext = longtext;
        }

        var result = {
                "byId" : {}
        };

        var allDegreesResponse = valueService.call("getAll", {
                "valueClass" : "Degree",
                "lang" : lang
        });
        var values = allDegreesResponse.xpathList("values/value");
        for (var i=0; i<values.size(); i++) {
                var value = values.get(i);
                var degree = new Degree(
                        idAsStringOrNull(value.longValue("id")),
                        (value.stringValue("shorttext") + "").toString(),
                        (value.stringValue("defaulttext") + "").toString(),
                        (value.stringValue("longtext") + "").toString()
                );

                result.byId[degree.id] = degree;
        }

        return result;
}

/* function to query value-class "CourseOfStudy" ********************************************/
function getAllCourseOfStudy(lang) {
        function CourseOfStudy(id, uniquename, shorttext, defaulttext, longtext) {
                this.id = id;
                this.uniquename = uniquename;
                this.shorttext = shorttext;
                this.defaulttext = defaulttext;
                this.longtext = longtext;
        }
        var result = {
                "byId" : {}
        };

        var allCourseOfStudyResponse = valueService.call("getAll", {
                "valueClass" : "CourseOfStudy",
                "lang" : lang
        });
        var values = allCourseOfStudyResponse.xpathList("values/value");
        for (var i=0; i<values.size(); i++) {
                var value = values.get(i);
                var courseOfStudy = new CourseOfStudy(
                        idAsStringOrNull(value.longValue("id")),
                        (value.stringValue("uniquename") + "").toString(),
                        (value.stringValue("shorttext") + "").toString(),
                        (value.stringValue("defaulttext") + "").toString(),
                        (value.stringValue("longtext") + "").toString()
                );

                result.byId[courseOfStudy.id] = courseOfStudy;
        }

        return result;
}

/* function to query value-class "Period" ***************************************/
function getAllPeriods(lang) {
        function Period(id, uniquename, shorttext, defaulttext, longtext) {
                this.id = id;
                this.uniquename = uniquename;
                this.shorttext = shorttext;
                this.defaulttext = defaulttext;
                this.longtext = longtext;
        }
        var result = {
                "byId" : {}
        };

        var allPeriodResponse = valueService.call("getAll", {
                "valueClass" : "Period",
                "lang" : lang
        });
        var values = allPeriodResponse.xpathList("values/value");
        for (var i=0; i<values.size(); i++) {
                var value = values.get(i);
                var period = new Period(
                        idAsStringOrNull(value.longValue("id")),
                        (value.stringValue("uniquename") + "").toString(),
                        (value.stringValue("shorttext") + "").toString(),
                        (value.stringValue("defaulttext") + "").toString(),
                        (value.stringValue("longtext") + "").toString()
                );

                result.byId[period.id] = period;
        }

        return result;
}

/* web service related functions (data acquisition, processing, return ***************************/

/* function to acquire a CourseOfStudy by id, final object is enriched by passed, related Degree */
function getCourseOfStudyById(id, degree, lang) {

        // log
        sharedLogger.debug("getCourseOfStudyById");

        var courseOfStudyResponse = courseOfStudyService.call("getCourseOfStudyById", {"courseOfStudyId" : id});

        return new CourseOfStudy(
               idAsStringOrNull(courseOfStudyResponse.longValue("courseOfStudy/id")),
               (courseOfStudyResponse.stringValue("courseOfStudy/shorttext") + "").toString(),
               (courseOfStudyResponse.stringValue("courseOfStudy/defaulttext") + "").toString(),
               (courseOfStudyResponse.stringValue("courseOfStudy/longtext") + "").toString(),
               degree
              );
}

/* function to determine the actual semester period **********************************************/
function getActualSemesterPeriod() {

        sharedLogger.debug("getActualSemesterPeriod");

        var now = new Date();

        var periodResponse = periodService.call("getActivePeriodDtoByType", {"hisKeyId" : PERIOD_SZ_HISKEY_ID, "ignoreDefault" : false, "date" : now});

        var startdateTimestamp = Number(periodResponse.dateValue("period/startdate").getTime());
        var enddateTimestamp = Number(periodResponse.dateValue("period/enddate").getTime());

        // log
        sharedLogger.debug("startdateTimestamp (type:" + (typeof startdateTimestamp) + ")=" + startdateTimestamp);
        sharedLogger.debug("enddateTimestamp (type:" + (typeof enddateTimestamp) + ")=" + enddateTimestamp);

        var startdate = new Date(startdateTimestamp);
        var enddate = new Date(enddateTimestamp);

        // log
        sharedLogger.debug("startdate=" + startdate);
        sharedLogger.debug("enddate=" + enddate);

        // log
        sharedLogger.debug("startdate (ISO)=" + toIsoDate(startdate));
        sharedLogger.debug("enddate (ISO)=" + toIsoDate(enddate));

        return new Period(
                idAsStringOrNull( periodResponse.longValue("period/id")),
                periodResponse.stringValue("period/uniquename"),
                periodResponse.stringValue("period/shorttext"),
                periodResponse.stringValue("period/defaulttext"),
                periodResponse.stringValue("period/longtext"),
                periodResponse.stringValue("period/year"),
                startdate,
                enddate
        );

}

/* function to determine the personId by a passed registrationnumber *****************************/
function findPersonIdByRegistrationnumber(registrationnumber) {

        // log
        sharedLogger.debug("findPersonIdByRegistrationnumber registrationnumber=" + registrationnumber);

        var findStudentResponse = studentService.call("findStudent", {"registrationnumber" : registrationnumber});

        var personIds = findStudentResponse.longValues("studentInfos/studentInfo/personId");

        var personId = 0;

        if (personIds.length == 1) {
            // should always be the case!
            personId = personIds[0];
        }

        return personId;
}

/* function to determine if a person is a student or auditor (=Gasthoerer)*************************/
function isStudentAuditor(personId) {

        // log
        sharedLogger.debug("isStudentAuditor personId=" + personId);

        var now = new Date();

        var result = rightsAndRolesService.call("findOrgRole60",
            {
                 "personId" : (personId + "").toString(),
                 "validFrom" : "<=" + toIsoDate(now),
                 "validTo" : ">=" + toIsoDate(now),
                 "roleHiskeyId" : `${ROLE_HISKEY_IDS.STUDENT},${ROLE_HISKEY_IDS.AUDITOR}`
            });

        var numberOfOrgRoleInfos = result.count("//OrgRoleInfos/OrgRoleInfo");

        return numberOfOrgRoleInfos > 0;
}

/* function to find the main data by a passed personId *******************************************/
function findMainDataByPersonId(personId, withEmailAddress) {
        sharedLogger.debug("findMainDataByPersonId personId=" + personId);

        var readPersonResult = personService.call("readPerson201806", {"id" : personId});

        var firstname = readPersonResult.stringValue("person/firstname");
        if (firstname) {
                firstname = (firstname + "").toString();
        }

        var surname = readPersonResult.stringValue("person/surname");
        if (surname) {
                surname = (surname + "").toString();
        }

        var birthcity = readPersonResult.stringValue("person/birthcity");
        if (birthcity) {
                birthcity = (birthcity + "").toString();
        }

        if(readPersonResult.dateValue("person/dateofbirth")) {
                var birthdateTimestamp = Number(readPersonResult.dateValue("person/dateofbirth").getTime());
                if (birthdateTimestamp) {
                        // log
                        sharedLogger.debug("birthdateTimestamp (type:" + (typeof birthdateTimestamp) + ")=" + birthdateTimestamp);
                        var birthdate = new Date(birthdateTimestamp);

                        // log
                        sharedLogger.debug("birthdate=" + birthdate);
                }
        }

		var rzEmail = null;
		if(withEmailAddress == true) {
			rzEmail = findRZEmailByPersonId(personId);	
		}

        if (!firstname && !surname && !birthcity && !birthdate && !rzEmail) {
                return null;
        }

        sharedLogger.debug("findMainDataByPersonId found by personId=" + personId + ":" + " firstname=" + firstname + " surname=" + surname + " rzEmail=" + rzEmail + " birthcity=" + birthcity + " birthdate=" + birthdate);

        return {
                "firstname" : firstname,
                "surname" : surname,
				"email": rzEmail,
                "birthcity" : birthcity,
                "birthdate" : birthdate
        };
}

/* function to find the student data by a passed personId ****************************************/
function findStudentDataByPersonId(personId, withStudentStatus, withCourseOfStudy, withDegree, lang) {
        sharedLogger.debug("findStudentDataByPersonId personId=" + personId);

        var readStudentResult = studentService.call("readStudentByPersonId", {"personId" : personId, "withDegreePrograms" : true, "withAddresses" : false, "withAccounts" : false, "withPersonAttributes" : false});
        sharedLogger.debug("readStudentResult=" + readStudentResult);

        var degreeProgramProgresses = readStudentResult.xpathList("student/degreePrograms/degreeProgram/progress/degreeProgramProgress");

        sharedLogger.debug("degreeProgramProgresses: " + degreeProgramProgresses);

        // collect all degreeProgramProgresses
        var dPPs = [];

        for (var i=0; i<degreeProgramProgresses.size(); i++) {
			var degreeProgramProgress = degreeProgramProgresses[i];

            sharedLogger.debug("degreeProgramProgress: " + degreeProgramProgress);

			var coS = null;

			if(withCourseOfStudy == true || withStudentStatus == true) {
				var courseOfStudyResponse = courseOfStudyService.call("getCourseOfStudyById", {"courseOfStudyId" : degreeProgramProgress.longValue("courseOfStudyId")});

				var degree = null;
				if (withDegree == true) {
					var degrees = getAllDegrees(lang);
					degree = degrees.byId[courseOfStudyResponse.longValue("courseOfStudy/degreeId")];
				}

				var studentstatusByUniquename = null;
				if (withStudentStatus == true) {
					var studentstatus = getAllStudentstatus(lang);
					studentstatusByUniquename = studentstatus.byUniquename[degreeProgramProgress.stringValue("studentstatus")];
				}
				
				if(withCourseOfStudy == true) {
					coS = new CourseOfStudy(
								idAsStringOrNull(courseOfStudyResponse.longValue("courseOfStudy/id")),
								(courseOfStudyResponse.stringValue("courseOfStudy/shorttext") + "").toString(),
								(courseOfStudyResponse.stringValue("courseOfStudy/defaulttext") + "").toString(),
								(courseOfStudyResponse.stringValue("courseOfStudy/longtext") + "").toString(),
								degree
							);
							
					if(lang == "EN"){
						// retrieve translations via KeyvalueService and replace on object
						var coursesOfStudyKeyvalue = getAllCourseOfStudy(lang);
						var courseOfStudyKeyvalue = coursesOfStudyKeyvalue.byId[coS.id];
						coS.shorttext = courseOfStudyKeyvalue.shorttext;
						coS.defaulttext = courseOfStudyKeyvalue.defaulttext;
						coS.longtext = courseOfStudyKeyvalue.longtext;
					}
				}
				
			}

			var dPP = new DegreeProgramProgress(
							idAsStringOrNull(degreeProgramProgress.longValue("id")),
                            idAsStringOrNull(degreeProgramProgress.longValue("periodId")),
                            degreeProgramProgress.dateValue("startdate"),
                            degreeProgramProgress.dateValue("enddate"),
                            degreeProgramProgress.dateValue("finished"),
                            studentstatusByUniquename,
                            coS
						);
               dPPs.push(dPP);
        }

        sharedLogger.debug("Number of DPPs collected: " + dPPs.length);

        var flattenedData = flattenDPPs(dPPs);

        return flattenedData;
}

/* function to acquire a data-center-e-mail-address (RZ-e-mail) by personId (if present) */
function findRZEmailByPersonId(personId) {

    // log
    sharedLogger.debug("findEaddress for personId=" + personId);

    // Call the web service to get the e-address
	var eaddressResponse = personAddressService.call("findEaddress", {
		"personId": personId,
		"addresstag": RZ_EMAIL_ADDRESSTAG
	});

    // Extract the list of eaddressInfos from the response
    var eaddressInfos = eaddressResponse.xpathList("eaddressInfos/eaddressInfo");

    if (eaddressInfos.size() > 0) {
        // Get the first eaddressInfo and return the eaddressValue
        var firstEaddressInfo = eaddressInfos.get(0);
        var eaddressValue = firstEaddressInfo.stringValue("eaddressValue");

        // log
        sharedLogger.debug("Found eaddressValue: " + eaddressValue);

        return eaddressValue;
    }

    // log
    sharedLogger.debug("No eaddress found for personId=" + personId);

    return null;
}