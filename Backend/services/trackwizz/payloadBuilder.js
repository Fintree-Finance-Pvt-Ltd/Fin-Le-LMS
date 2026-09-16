/**
 * Backend/services/trackwizz/payloadBuilder.js
 *
 * TrackWizz AS504 Purpose-01 payload builder
 * for Personal Loan.
 *
 * Input comes from loanBookingAdapter.js:
 *
 * {
 *   partner,
 *   leadId,
 *   clientId,
 *   lan,
 *   customerCode,
 *   applicationRefNumber,
 *   fullName,
 *   fatherName,
 *   pan,
 *   mobile,
 *   email,
 *   dob,
 *   gender,
 *   createdAt
 * }
 */

const config =
  require("../../config/trackwizz.config");


/* =====================================================
   DATE HELPERS
===================================================== */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];


const TW_DATE_REGEX =
  /^(0[1-9]|[12]\d|3[01])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}$/;


/**
 * Convert date to TrackWizz format:
 *
 * DD-MMM-YYYY
 *
 * Example:
 *
 * 1995-08-21
 * ->
 * 21-Aug-1995
 */
function twDate(value) {
  if (!value) {
    return "";
  }


  const raw =
    String(value).trim();


  /*
   * Already TrackWizz format.
   */
  if (
    TW_DATE_REGEX.test(
      raw
    )
  ) {
    return raw;
  }


  /*
   * MySQL date / datetime.
   *
   * YYYY-MM-DD
   * YYYY-MM-DD HH:mm:ss
   */
  const mysqlDate =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );


  if (mysqlDate) {
    const [
      ,
      yyyy,
      mm,
      dd,
    ] = mysqlDate;


    const month =
      Number(mm);


    const day =
      Number(dd);


    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return (
        `${dd}-` +
        `${MONTHS[month - 1]}-` +
        `${yyyy}`
      );
    }
  }


  /*
   * Normal Date fallback.
   */
  const date =
    value instanceof Date
      ? value
      : new Date(raw);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${day}-` +
    `${MONTHS[date.getMonth()]}-` +
    `${date.getFullYear()}`
  );
}


/* =====================================================
   REQUEST ID
===================================================== */

/**
 * TrackWizz requestId:
 *
 * - must be unique
 * - only safe characters
 */
function buildRequestId(lan) {
  const safeLan =
    String(
      lan || ""
    )
      .trim()
      .replace(
        /[^A-Za-z0-9\-_. ]/g,
        ""
      );


  if (!safeLan) {
    const err =
      new Error(
        "Valid LAN is required for requestId"
      );

    err.code =
      "INVALID_LAN";

    throw err;
  }


  return (
    `LAN-${safeLan}-${Date.now()}`
  );
}


/* =====================================================
   NAME SANITIZER
===================================================== */

function sanitizeName(raw) {
  if (!raw) {
    return "";
  }


  let value =
    String(raw).trim();


  /*
   * Remove duplicate special chars.
   */
  value =
    value.replace(
      /([^A-Za-z0-9])\1+/g,
      "$1"
    );


  /*
   * Remove consecutive special characters.
   */
  value =
    value.replace(
      /([^A-Za-z0-9 ])(?=[^A-Za-z0-9 ])/g,
      ""
    );


  /*
   * Normalize multiple spaces.
   */
  value =
    value.replace(
      /\s{2,}/g,
      " "
    );


  /*
   * First character should not
   * be an invalid special char.
   */
  value =
    value.replace(
      /^[^A-Za-z0-9]+/,
      ""
    );


  /*
   * TrackWizz screening name
   * should contain an alphabet.
   */
  if (
    !/[A-Za-z]/.test(
      value
    )
  ) {
    return "";
  }


  return value.trim();
}


/* =====================================================
   PURPOSE 01 PAYLOAD
===================================================== */

function buildPurpose01Payload(
  lead
) {

  /* -----------------------------------------------
     Basic checks
  ----------------------------------------------- */

  if (
    !lead ||
    !lead.lan
  ) {
    const err =
      new Error(
        "lead.lan is required"
      );

    err.code =
      "LAN_REQUIRED";

    throw err;
  }


  if (
    !lead.customerCode
  ) {
    const err =
      new Error(
        "lead.customerCode is required"
      );

    err.code =
      "CUSTOMER_CODE_REQUIRED";

    throw err;
  }


  if (
    !config.sourceSystemName
  ) {
    const err =
      new Error(
        "TW_SOURCE_SYSTEM_NAME is not configured"
      );

    err.code =
      "SOURCE_SYSTEM_NAME_REQUIRED";

    throw err;
  }


  /*
   * Existing working TrackWizz payload
   * passes complete name in firstName.
   */
  const firstName =
    sanitizeName(
      lead.fullName ||
        ""
    );


  const fatherFirstName =
    sanitizeName(
      lead.fatherName ||
        ""
    );


  /*
   * We need at least one identity
   * field before spending an API call.
   */
  const hasIdentifier =
    firstName ||
    lead.mobile ||
    lead.email ||
    lead.pan;


  if (!hasIdentifier) {
    const err =
      new Error(
        "AS504 purpose 01 needs at least one identifier: name, mobile, email or PAN"
      );

    err.code =
      "NO_IDENTIFIER";

    throw err;
  }


  const requestId =
    buildRequestId(
      lead.lan
    );


  /* ===================================================
     CUSTOMER PAYLOAD
  =================================================== */

  const customer = {

    ekycOTPbased:
      "",

    ekycOTPbasedId:
      null,


    segment:
      "",

    NationalId:
      "",

    segmentId:
      null,


    countryofEducation:
      "IND",

    CountryOfEmployment:
      "IND",


    segmentStartDate:
      "",

    segmentStartDateDateTime:
      null,


    status:
      "Active",

    statusId:
      null,


    effectiveDate:
      "",

    effectiveDateDateTime:
      null,


    minor:
      "",

    minorId:
      null,


    maritalStatus:
      "",

    maritalStatusId:
      null,


    occupationType:
      "",

    occupationTypeOther:
      "",

    occupationTypeId:
      null,


    natureOfBusinessOther:
      "",


    companyIdentificationNumber:
      "",


    UdhyamRC:
      "",


    ISIN:
      "",


    companyRegistrationNumber:
      "",


    companyRegistrationCountry:
      "",

    companyRegistrationCountryId:
      null,


    globalIntermediaryIdentificationNumber:
      "",


    kycAttestationType:
      "1",

    kycAttestationTypeId:
      null,


    kycDateOfDeclaration:
      "",

    kycDateOfDeclarationDateTime:
      null,


    kycPlaceOfDeclaration:
      "Mumbai",


    kycVerificationDate:
      "",

    kycVerificationDateDateTime:
      null,


    kycEmployeeName:
      "",


    kycEmployeeDesignation:
      "",


    kycVerificationBranch:
      "",


    kycEmployeeCode:
      "",


    listed:
      "",


    BranchCode:
      "",


    listedId:
      null,


    /*
     * PL:
     *
     * pl_partner_applications
     * .partner_application_id
     */
    applicationRefNumber:
      String(
        lead.applicationRefNumber ||
          ""
      ),


    documentRefNumber:
      "",


    regAMLRisk:
      "",

    regAMLRiskId:
      null,


    regAMLRiskLastRiskReviewDate:
      "",

    regAMLRiskLastRiskReviewDateDateTime:
      null,


    regAMLRiskNextRiskReviewDate:
      "",

    regAMLRiskNextRiskReviewDateDateTime:
      null,


    /*
     * Do not send fake income
     * or net-worth information.
     */
    incomeRange:
      "",

    incomeRangeId:
      null,


    exactIncome:
      null,


    incomeCurrency:
      "",

    incomeCurrencyId:
      null,


    incomeEffectiveDate:
      "",

    incomeEffectiveDateDateTime:
      null,


    incomeDescription:
      "",


    incomeDocument:
      "",

    incomeDocumentId:
      null,


    exactNetworth:
      null,


    networthCurrency:
      "",

    networthCurrencyId:
      null,


    networthEffectiveDate:
      "",

    networthEffectiveDateDateTime:
      null,


    networthDescription:
      "",


    networthDocument:
      "",

    networthDocumentId:
      null,


    familyCode:
      "",


    channel:
      "",

    channelId:
      null,


    contactPersonFirstName1:
      "",

    contactPersonMiddleName1:
      "",

    contactPersonLastName1:
      "",

    contactPersonDesignation1:
      "",


    contactPersonFirstName2:
      "",

    contactPersonMiddleName2:
      "",

    contactPersonLastName2:
      "",

    contactPersonDesignation2:
      "",


    contactPersonMobileISD:
      "",

    contactPersonMobileNo:
      "",


    contactPersonMobileISD2:
      "",

    contactPersonMobileNo2:
      "",


    contactPersonEmailId1:
      "",

    contactPersonEmailId2:
      "",


    commencementDate:
      "",

    commencementDateDateTime:
      null,


    maidenPrefix:
      "",

    maidenPrefixId:
      null,


    maidenFirstName:
      "",

    maidenMiddleName:
      "",

    maidenLastName:
      "",


    relatedPersonCountforCKYC:
      1,


    /*
     * PL PAN
     */
    proofOfIdSubmitted:
      lead.pan
        ? "PAN"
        : "",

    proofOfIdSubmittedId:
      null,


    products:
      "Loan",

    productsId:
      null,


    natureOfBusiness:
      "Oth",

    natureOfBusinessId:
      null,


    educationalQualification:
      "1",

    educationalQualificationId:
      null,


    countryOfOperations:
      "IND",

    countryOfOperationsId:
      null,


    /*
     * Indian mobile ISD.
     */
    personalMobileISD:
      "91",


    /*
     * PL:
     * mobile_number
     */
    personalMobileNumber:
      lead.mobile ||
      "",


    workMobileISD:
      "91",


    workMobileNumber:
      "",


    regAMLRiskSpecialCategoryDtoList:
      [],


    relatedPersonList:
      [],


    customerRelationDtoList:
      [],


    /*
     * Constitution Type 1 =
     * individual in current
     * tested TrackWizz setup.
     */
    constitutionType:
      "1",

    constitutionTypeId:
      0,


    /*
     * Must be whitelisted
     * by TrackWizz.
     */
    sourceSystemName:
      config.sourceSystemName,


    /*
     * PL:
     *
     * FINTREEPL-
     * <partner_application_id>
     */
    sourceSystemCustomerCode:
      String(
        lead.customerCode
      ),


    /*
     * PL:
     * created_at
     */
    sourceSystemCustomerCreationDate:
      twDate(
        lead.createdAt
      ),

    sourceSystemCustomerCreationDateDateTime:
      null,


    /*
     * PL:
     * lan
     */
    uniqueIdentifier:
      String(
        lead.lan
      ),


    SystemGeneratedId:
      null,


    prefix:
      "",

    prefixId:
      null,


    /*
     * PL:
     * customer_full_name
     */
    firstName,


    middleName:
      "",


    lastName:
      "",


    alias:
      null,


    /*
     * PL:
     * customer_father_name
     */
    fatherPrefix:
      fatherFirstName
        ? "Mr"
        : "",

    fatherPrefixId:
      null,


    fatherFirstName,


    fatherMiddleName:
      "",


    fatherLastName:
      "",


    spousePrefix:
      "",

    spousePrefixId:
      null,


    spouseFirstName:
      "",


    spouseMiddleName:
      "",


    spouseLastName:
      "",


    motherPrefix:
      "",

    motherPrefixId:
      null,


    motherFirstName:
      "",


    motherMiddleName:
      "",


    motherLastName:
      "",


    /*
     * Adapter converts:
     *
     * Male   -> 01
     * Female -> 02
     */
    gender:
      lead.gender ||
      "",

    genderId:
      null,


    /*
     * PL:
     * date_of_birth
     */
    dateofBirth:
      twDate(
        lead.dob
      ),

    dateofBirthDateTime:
      null,


    workEmail:
      "",


    /*
     * PL:
     * email
     */
    personalEmail:
      lead.email ||
      "",


    permanentAddressCountry:
      "",

    permanentAddressCountryId:
      null,


    permanentAddressZipCode:
      "",


    permanentAddressLine1:
      "",


    permanentAddressLine2:
      "",


    permanentAddressLine3:
      "",


    permanentAddressDistrict:
      ".",


    permanentAddressCity:
      ".",


    permanentAddressState:
      "",


    permanentAddressOtherState:
      "",


    permanentAddressStateId:
      null,


    permanentAddressDocument:
      "",


    permanentAddressDocumentId:
      null,


    permanentAddressDocumentOthersValue:
      "",


    correspondenceAddressCountry:
      "",

    correspondenceAddressCountryId:
      null,


    correspondenceAddressZipCode:
      "",


    correspondenceAddressLine1:
      "",


    correspondenceAddressLine2:
      "",


    correspondenceAddressLine3:
      "",


    correspondenceAddressDistrict:
      ".",


    correspondenceAddressCity:
      ".",


    correspondenceAddressState:
      "",


    correspondenceAddressOtherState:
      "",


    correspondenceAddressStateId:
      null,


    correspondenceAddressDocument:
      "",


    correspondenceAddressDocumentId:
      null,


    countryOfResidence:
      "",

    countryOfResidenceId:
      null,


    countryOfBirth:
      "",

    countryOfBirthId:
      null,


    birthCity:
      "",


    passportIssueCountry:
      "",

    passportIssueCountryId:
      null,


    passportNumber:
      "",


    passportExpiryDate:
      "",

    passportExpiryDateDateTime:
      null,


    voterIdNumber:
      "",


    drivingLicenseNumber:
      "",


    drivingLicenseExpiryDate:
      "",

    drivingLicenseExpiryDateDateTime:
      null,


    /*
     * Don't send actual Aadhaar here.
     */
    aadhaarNumber:
      "",


    aadhaarVaultReferenceNumber:
      "",


    nregaNumber:
      "",


    nprLetterNumber:
      "",


    directorIdentificationNumber:
      "",


    /*
     * PAN exists:
     * Form 60 = No
     *
     * PAN missing:
     * Form 60 = Yes
     */
    formSixty:
      lead.pan
        ? "0"
        : "1",

    formSixtyId:
      null,


    /*
     * PL:
     * pan_number
     */
    pan:
      lead.pan ||
      "",


    ckycNumber:
      "",


    identityDocument:
      null,

    identityDocumentId:
      null,


    politicallyExposed:
      "",

    politicallyExposedId:
      null,


    adverseReputationstring:
      null,


    adverseReputationDetails:
      "",


    notes:
      "",


    tags:
      "",

    tagsId:
      null,


    screeningProfile:
      "",


    /*
     * Ask TrackWizz to return
     * report even for NIL result.
     */
    screeningReportWhenNil:
      "1",

    screeningReportWhenNilId:
      null,


    riskProfile:
      null,


    adverseReputation:
      "",

    adverseReputationId:
      null,


    adverseReputationClassification:
      "",

    adverseReputationClassificationId:
      null,


    /*
     * Keep same structure as
     * working TrackWizz payload.
     */
    taxDetailDtoList: [
      {
        Id:
          0,

        taxResidencyCountry:
          "IND",

        taxResidencyCountryId:
          null,

        taxIdentificationNumber:
          "",

        taxResidencyStartDate:
          "",

        taxResidencyStartDateDateTime:
          null,

        taxResidencyEndDate:
          "",

        taxResidencyEndDateDateTime:
          null,
      },
    ],


    gstinDtoList: [
      {
        Id:
          0,

        gstinNumber:
          "",

        GSTINStartDate:
          "",

        GSTINStartDateDateTime:
          null,

        GSTINEndDate:
          "",

        GSTINEndDateDateTime:
          null,
      },
    ],


    politicallyExposedClassification:
      "",

    politicallyExposedClassificationId:
      null,


    citizenships:
      "IND",

    citizenshipsId:
      null,


    nationalities:
      "",

    nationalitiesId:
      null,


    documents:
      null,
  };


  /* ===================================================
     FINAL TRACKWIZZ REQUEST
  =================================================== */

  const payload = {

    requestId,


    /*
     * Must match the same configured
     * sourceSystemName inside customer.
     */
    sourceSystemName:
      config.sourceSystemName,


    /*
     * AML screening
     */
    purpose:
      "01",


    customerList: [
      customer,
    ],
  };


  return {
    requestId,

    payload,
  };
}


/* =====================================================
   EXPORTS
===================================================== */

module.exports = {

  buildPurpose01Payload,

  twDate,

  buildRequestId,

  sanitizeName,
};