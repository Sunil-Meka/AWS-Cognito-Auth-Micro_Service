const axios = require("axios");
const jwkToPem = require("jwk-to-pem");
const jwt = require("jsonwebtoken");

const AmazonCognitoIdentity = require("amazon-cognito-identity-js");

const { poolData, pool_region } = require("../../admin/admin");
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

import { response } from "express";
import {
  ConfirmUserResponse,
  DeleteUserResponse,
  GetUserResponse,
  SignInUserResponse,
  SignUpUserResponse,
  UpdateUserResponse,
  UserApi,
  ValidateUserTokenResponse,
} from "../../../dist/api/user/types";
import { Api } from "../../../dist/models";

export class UserApiImpl implements UserApi {
  signUpUser(request: Api.User): Promise<SignUpUserResponse> {
    return new Promise<SignUpUserResponse>((resolve, reject) => {
      var name = request.name;
      var email = request.email;
      var password = request.password;
      var attributeList = [];
      console.log(name, email, password);
      attributeList.push(
        new AmazonCognitoIdentity.CognitoUserAttribute({
          Name: "email",
          Value: email,
        })
      );
      userPool.signUp(
        name,
        password,
        attributeList,
        null,
        function (err: any, result: { user: any }) {
          if (result) {
            var cognitoUser = result.user;
            const response = <SignUpUserResponse>{
              status: 201,
              body: cognitoUser,
            };
            resolve(response);
          } else {
            console.log(err);
            console.log(err.code);
            console.log(err.code.toString());
            if (err.code.match("UsernameExistsException")) {
              const response = <SignUpUserResponse>{
                status: 400,
                body: { message: `Username already exists` },
              };
              resolve(response);
            } else if (err.code.match("InvalidParameterException")) {
              const response = <SignUpUserResponse>{
                status: 409,
                body: { message: `Invalid user name format` },
              };
              resolve(response);
            } else {
              const response = <SignUpUserResponse>{
                status: 400,
                body: { message: `${err.code}` },
              };
              resolve(response);
            }
          }
        }
      );
    });
  }

  confirmUser(request: Api.ConfirmUser): Promise<ConfirmUserResponse> {
    return new Promise<ConfirmUserResponse>((resolve, reject) => {
      var userName = request.userName;
      var code = request.code;
      var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      var userData = {
        Username: userName,
        Pool: userPool,
      };
      var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
      cognitoUser.confirmRegistration(
        code,
        true,
        function (err: { code: string }, result: any) {
          console.log("completed confirmation");
          if (err) {
            if (err.code.match("NotAuthorizedException")) {
              const response = <ConfirmUserResponse>{
                status: 400,
                body: { message: `Not Authorized` },
              };
              resolve(response);
            } else {
              const response = <ConfirmUserResponse>{
                status: 404,
                body: { message: `${err.code}` },
              };
              resolve(response);
            }
          } else {
            const response = <ConfirmUserResponse>{
              status: 200,
              body: { message: `${result}` },
            };
            resolve(response);
          }
        }
      );
    });
  }

  getUser(userName: string, password: string): Promise<GetUserResponse> {
    return new Promise<GetUserResponse>((resolve, reject) => {
      var authenticationDetails =
        new AmazonCognitoIdentity.AuthenticationDetails({
          Username: userName,
          Password: password,
        });
      var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      var userData = {
        Username: userName,
        Pool: userPool,
      };
      var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result: any) {
          // console.log(result);
          // cognitoUser.updateAttributes(attributeList, (err, result) => {
          cognitoUser.getUserData((err: any, result: any) => {
            if (err) {
              console.log(err);
              const response = <GetUserResponse>{ status: {}, body: {} };
              response.status = 400;
              response.body = { message: `${err}` };
              //handle error
            } else {
              console.log(result);
              let userData = <Api.GetUserResponse>[];
              let userAttr = <Api.GetUserResponse.UserAttributes>[];
              result.UserAttributes.forEach((data: any) => {
                if (data.Name == "address") {
                  userAttr.address = data.Value;
                } else if (data.Name == "email") {
                  userAttr.email = data.Value;
                } else if (data.Name == "email_verified") {
                  userAttr.email_verified = data.Value;
                } else if (data.Name == "gender") {
                  userAttr.gender = data.Value;
                }
              });
              userData.UserAttributes = userAttr;
              userData.Username = result.Username;
              const response = <GetUserResponse>{ status: 200, body: userData };
              resolve(response);
            }
          }, userData);
        },
        onFailure: function (err: any) {
          const response = <GetUserResponse>{
            status: 404,
            body: { message: `${err.code}` },
          };
          resolve(response);
        },
      });
    });
  }

  updateUser(
    userName: string,
    password: string,
    request: Api.UpdateAttributes
  ): Promise<UpdateUserResponse> {
    return new Promise<UpdateUserResponse>((resolve, reject) => {
      console.log(userName, password);

      var attributeList = <any>[];
      Object.entries(request).forEach(([key, value]) => {
        if (value) {
          console.log(key, value);
          attributeList.push(
            new AmazonCognitoIdentity.CognitoUserAttribute({
              Name: key,
              Value: value,
            })
          );
        }
      });
      console.log(attributeList);
      var authenticationDetails =
        new AmazonCognitoIdentity.AuthenticationDetails({
          Username: userName,
          Password: password,
        });
      var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      var userData = {
        Username: userName,
        Pool: userPool,
      };
      var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result: any) {
          console.log(result);
          cognitoUser.updateAttributes(
            attributeList,
            (err: any, result: any) => {
              if (err) {
                console.log(err);
                const response = <UpdateUserResponse>{ status: {}, body: {} };
                response.status = 400;
                response.body = { message: `${err}` };
              } else {
                console.log("success");
                const response = <UpdateUserResponse>{
                  status: 200,
                  body: { message: `Updated user successfully` },
                };
                resolve(response);
              }
            }
          );
        },
        onFailure: function (err: any) {
          const response = <UpdateUserResponse>{
            status: 404,
            body: { message: `${err.code}` },
          };
          resolve(response);
        },
      });
    });
  }

  deleteUser(userName: string, password: string):Promise<DeleteUserResponse>{
	  return new Promise<DeleteUserResponse>((resolve, reject) => {
		var authenticationDetails =
        new AmazonCognitoIdentity.AuthenticationDetails({
          Username: userName,
          Password: password,
        });
      var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      var userData = {
        Username: userName,
        Pool: userPool,
      };
      var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result: any) {
          console.log(result);
          cognitoUser.deleteUser(
            (err: any, result: any) => {
              if (err) {
                console.log(err);
                const response = <DeleteUserResponse>{ status: {}, body: {} };
                response.status = 400;
                response.body = { message: `${err}` };
              } else {
                console.log("success");
                const response = <DeleteUserResponse>{
                  status: 200,
                  body: { message: `Deleted user successfully` },
                };
                resolve(response);
              }
            }
          );
        },
        onFailure: function (err: any) {
          const response = <DeleteUserResponse>{
            status: 404,
            body: { message: `${err.code}` },
          };
          resolve(response);
        },
      });
	  })
  }

  signInUser(request: Api.SignInUser): Promise<SignInUserResponse> {
    return new Promise<SignInUserResponse>((resolve, reject) => {
      var userName = request.userName;
      var password = request.password;
      var authenticationDetails =
        new AmazonCognitoIdentity.AuthenticationDetails({
          Username: userName,
          Password: password,
        });
      var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      var userData = {
        Username: userName,
        Pool: userPool,
      };
      var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result: any) {
          var accesstoken = result.getAccessToken().getJwtToken();
          var id_token = result.getIdToken().getJwtToken();
          var refresh_token = result.getRefreshToken().getToken();
          console.log(accesstoken);
          const response = <SignInUserResponse>{
            status: 200,
            body: {
              accesToken: accesstoken,
              id_token: id_token,
              refresh_token: refresh_token,
            },
          };
          resolve(response);
        },
        onFailure: function (err: any) {
          if (err.code.match("NotAuthorizedException")) {
            const response = <SignInUserResponse>{
              status: 400,
              body: { message: `Not Authorized` },
            };
            resolve(response);
          } else if (err.code.match("UserNotFoundException")) {
            const response = <SignInUserResponse>{
              status: 404,
              body: { message: `User Not Found` },
            };
            resolve(response);
          } else {
            const response = <SignInUserResponse>{
              status: 400,
              body: { message: `${err.code}` },
            };
            resolve(response);
          }
        },
      });
    });
  }

  validateUserToken(request: Api.Token): Promise<ValidateUserTokenResponse> {
    return new Promise<ValidateUserTokenResponse>((resolve, reject) => {
      const token = request.token;

      axios
        .get(
          `https://cognito-idp.${pool_region}.amazonaws.com/${poolData.UserPoolId}/.well-known/jwks.json`
        )
        .then((res: { status: number; data: { [x: string]: any } }) => {
          const response = <ValidateUserTokenResponse>{
            status: {},
            body: {},
          };
          if (res.status === 200) {
            try {
              let pems = [];
              var keys = res.data["keys"];
              for (var i = 0; i < keys.length; i++) {
                var key_id = keys[i].kid;
                var modulus = keys[i].n;
                var exponent = keys[i].e;
                var key_type = keys[i].kty;
                var jwk = { kty: key_type, n: modulus, e: exponent };
                var pem = jwkToPem(jwk);
                pems[key_id] = pem;
              }
              var decodedJwt = jwt.decode(token, { complete: true });

              if (!decodedJwt) {
                throw "Not a valid JWT token";
              }
              var kid = decodedJwt.header.kid;
              var pem = pems[kid];
              if (!pem) {
                throw "Invalid Token";
              }
              jwt.verify(token, pem, function (err: any, payload: any) {
                if (err) {
                  throw err;
                } else {
                  console.log("Valid Token.");
                  response.status = 201;
                  response.body = { message: `Valid Token` };
                  console.log(payload);
                  resolve(response);
                }
              });
            } catch (error) {
              response.status = 401;
              response.body = { message: `${error}` };
              resolve(response);
            }
          } else {
            response.status = 401;
            response.body = { message: `something went wrong` };
            resolve(response);
          }
        });
    });
  }
}
