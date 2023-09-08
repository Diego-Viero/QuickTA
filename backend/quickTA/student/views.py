import uuid
import re
import pytz 
import csv

from django.utils import timezone, dateparse
from django.shortcuts import render
from rest_framework.views import APIView
from django.http import JsonResponse
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from utils.handlers import ErrorResponse
from student.serializers import *
from users.models import User
from course.models import Course
from student.models import Conversation, Chatlog, Report, Feedback
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.http import HttpResponse

# Create your views here.

# Create a conversation
class ConversationView(APIView):
    
    @swagger_auto_schema(
        operation_summary="Get conversation details",
        responses={200: ConversationSerializer(), 404: "Conversation not found"},
        manual_parameters=[
            openapi.Parameter("conversation_id", openapi.IN_QUERY, description="Conversation ID", type=openapi.TYPE_STRING),
        ]
    )
    def get(self, request):
        """
        Acquires the details of a certain conversation by conversation_id.
        """
        conversation_id = request.query_params.get('conversation_id', '')
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        serializer = ConversationSerializer(conversation)
        return JsonResponse(serializer.data)

    @swagger_auto_schema(
        operation_summary="Create a new conversation",
        manual_parameters=[
            openapi.Parameter("user_id", openapi.IN_QUERY, description="User ID", type=openapi.TYPE_STRING),
            openapi.Parameter("course_id", openapi.IN_QUERY, description="Course ID", type=openapi.TYPE_STRING),            
        ],
        responses={201: ConversationSerializer(), 400: "Bad Request"}
    )
    def post(self, request):
        """
        Creates a new conversation
        """
        user_id = request.query_params.get('user_id', '')
        course_id = request.query_params.get('course_id', '')

        user = get_object_or_404(User, user_id=user_id)
        course = get_object_or_404(Course, course_id=course_id)
        serializer = self.create_conversation(user, course)

        if serializer.is_valid():
            serializer.save()
            return JsonResponse(serializer.data, status=status.HTTP_201_CREATED)
        return ErrorResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    
    def create_conversation(self, user, course):
        course_id = uuid.uuid4()
        serializer = ConversationSerializer(
            data={
                "conversation_id": str(course_id),
                "course_id": str(course.course_id),
                "user_id": str(user.user_id),
            }
        )    
        return serializer

class ConversationListView(APIView):
    @swagger_auto_schema(
        operation_summary="Get all conversations",
        responses={200: ConversationSerializer(many=True)},
    )
    def get(self, request):
        """
        Gets all conversations
        """
        conversations = Conversation.objects.all()
        serializer = ConversationSerializer(conversations, many=True)
        return JsonResponse(serializer.data, safe=False)

class ConversationHistoryCsvView(APIView):

    def post(self, request):
        conversation_id = request.data.get('conversation_id')
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        user = get_object_or_404(User, user_id=conversation.user_id)
        chatlogs = Chatlog.objects.filter(conversation_id=conversation_id).order_by('time')

        response = HttpResponse(
            content_type='text/csv',
            headers={'Content-Disposition': 'attachment; filename="convo-report.csv"'}
        )
        response["Access-Control-Expose-Headers"] = "Content-Type, Content-Disposition"

        writer = csv.writer(response)
        for chatlog in chatlogs:
            formatted_time = chatlog.time.strftime("%m/%d/%Y %H:%M:%S")
            speaker = str(user.name) if chatlog.is_user else 'QuickTA'
            writer.writerow(['[' + formatted_time + ']', speaker, str(chatlog.chatlog)])

        return response

class ChatlogView(APIView):

    @swagger_auto_schema(
        operation_summary="Create a new chatlog",
        manual_parameters=[
            openapi.Parameter("conversation_id", openapi.IN_QUERY, description="Conversation ID", type=openapi.TYPE_STRING),
            openapi.Parameter("is_user", openapi.IN_QUERY, description="Is user", type=openapi.TYPE_BOOLEAN),
            openapi.Parameter("chatlog", openapi.IN_QUERY, description="Chatlog", type=openapi.TYPE_STRING),
        ],
        responses={201: ConversationSerializer(), 400: "Bad Request"}
    )
    def post(self, request):
        """
        Creates a new chatlog from the user, as well as acquiring a response from the LLM.
        """
        conversation_id = request.data.get('conversation_id', '')
        chatlog = request.data.get('chatlog', '')
        current_time, location = self.get_time(request)

        # 1. Create user chatlog record
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        last_chatlog = Chatlog.objects.filter(conversation_id=conversation_id).order_by('-time').first()
        delta = current_time - last_chatlog.time if last_chatlog else current_time - conversation.start_time
        user_chatlog = self.create_chatlog(conversation, chatlog, True, current_time, delta)

        # 2. Acquire LLM chatlog response 
        # course = get_object_or_404(Course, course_id=conversation.course_id)
        # model_response = model.get_response(conversation_id, course.course_id, chatlog)
        model_response = "Hello world"
        model_time = timezone.now() 
        model_chatlog = self.create_chatlog(conversation, model_response, False, model_time, delta)

        model_time = model_time.astimezone(pytz.timezone(location)).isoformat() + "[" + location + "]"
        user_time = current_time.astimezone(pytz.timezone(location)).isoformat() + "[" + location + "]"
        response = self.get_chatlog_response(user_chatlog, model_chatlog, user_time, model_time)

        return JsonResponse(response, status=status.HTTP_201_CREATED)
    
    def get_time(self, request):
        
        current_time = timezone.now() # Current time
        location = 'America/Toronto'  # Server location
        time = request.data.get('time', '')
        if time == '':
            return current_time, location
        else:
            idx = time.find('[')
            location = re.search(r"\[(.*?)\]", time).group()[1:-1]
            current_time = dateparse.parse_datetime(time[:idx])
            return current_time, location

    def create_chatlog(self, cid, chatlog, is_user, time, delta):
        chatlog_id = uuid.uuid4()
        chatlog = Chatlog(
            chatlog_id=str(chatlog_id),
            conversation_id=str(cid),
            time=time,
            is_user=is_user,
            chatlog=chatlog,
            delta=delta,
        )
        chatlog.save()
        return chatlog
    
    def get_chatlog_response(self, user_chatlog, model_chatlog, user_time, model_time):
        user_chatlog = user_chatlog.to_dict()
        model_chatlog = model_chatlog.to_dict()
        return {
            "agent": {
                **model_chatlog,
                "time": model_time
            },
            "user": {
                **user_chatlog,
                "time": user_time
            }
        }
    
class ChatlogListView(APIView):
    @swagger_auto_schema(
        operation_summary="Get all chatlogs from a conversation",
        responses={200: ChatlogSerializer(many=True)},
    )
    def get(self, request):
        """
        Gets all chatlogs
        """
        chatlogs = Chatlog.objects.all()
        serializer = ChatlogSerializer(chatlogs, many=True)
        return JsonResponse(serializer.data, safe=False)
    
class FeedbackView(APIView):

    @swagger_auto_schema(
        operation_summary="Get feedback details",
        responses={200: FeedbackSerializer(), 404: "Feedback not found"},
        manual_parameters=[
            openapi.Parameter("conversation_id", openapi.IN_QUERY, description="Conversation ID", type=openapi.TYPE_STRING),
        ]
    )
    def get(self, request):
        """
        Acquires the details of a certain feedback by conversation_id.
        """
        conversation_id = request.query_params.get('conversation_id', '')
        feedback = get_object_or_404(Feedback, conversation_id=conversation_id)
        serializer = FeedbackSerializer(feedback)
        return JsonResponse(serializer.data)

    @swagger_auto_schema(
        operation_summary="Create a new feedback",
        response_body=FeedbackSerializer(),
        responses={201: FeedbackSerializer(), 400: "Bad Request"}
    )
    def post(self, request):
        """
        Creates a new feedback
        """
        conversation_id = request.data.get('conversation_id', '')
        rating = request.data.get('rating', '')
        feedback_msg = request.data.get('feedback_msg', '')
        
        convo = get_object_or_404(Conversation, conversation_id=conversation_id)
        serializer = self.create_feedback(conversation_id, rating, feedback_msg)

        if serializer.is_valid():
            serializer.save()
            self.update_conversation_status(convo)
            return JsonResponse(serializer.data, status=status.HTTP_201_CREATED)
        return ErrorResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def create_feedback(self, conversation_id, rating, feedback_msg):
        feedback = Feedback(
            conversation_id=conversation_id,
            rating=rating,
            feedback_msg=feedback_msg
        )
        serializer = FeedbackSerializer(feedback)
        return serializer
    
    def update_conversation_status(self, conversation):
        Conversation.objects.filter(conversation_id=conversation.conversation_id).update(status='I')

class FeedbackListView(APIView):
    @swagger_auto_schema(
        operation_summary="Get all feedbacks",
        responses={200: FeedbackSerializer(many=True)},
    )
    def get(self, request):
        """
        Gets all feedbacks
        """
        feedbacks = Feedback.objects.all()
        serializer = FeedbackSerializer(feedbacks, many=True)
        return JsonResponse(serializer.data, safe=False)

class ReportView(APIView):

    @swagger_auto_schema(
        operation_summary="Get report details",
        responses={200: ReportSerializer(), 404: "Report not found"},
        manual_parameters=[
            openapi.Parameter("conversation_id", openapi.IN_QUERY, description="Conversation ID", type=openapi.TYPE_STRING),
        ]
    )
    def get(self, request):
        """
        Acquires the details of a certain report by conversation_id.
        """
        conversation_id = request.query_params.get('conversation_id', '')
        report = get_object_or_404(Report, conversation_id=conversation_id)
        serializer = ReportSerializer(report)
        return JsonResponse(serializer.data)

    @swagger_auto_schema(
        operation_summary="Create a new report",
        response_body=ReportSerializer(),
        responses={201: ReportSerializer(), 400: "Bad Request", 404: "Conversation not found"}
    )
    def post(self, request):
        """
        Creates a new report regarding any issues occurred with the user's experience during the conversation.
        """
        conversation_id = request.data.get('conversation_id', '')
        msg = request.data.get('msg', '')
        
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        serializer = self.create_report(conversation_id, msg)
        if not serializer.is_valid():
            serializer.save()
            return JsonResponse(serializer.data, status=status.HTTP_201_CREATED)
        return ErrorResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def create_report(self, conversation_id, msg):
        report = Report(
            conversation_id=conversation_id,
            msg=msg
        )
        serializer = ReportSerializer(report)
        return serializer

class ReportListView(APIView):
    @swagger_auto_schema(
        operation_summary="Get all reports",
        responses={200: ReportSerializer(many=True)},
    )
    def get(self, request):
        """
        Gets all reports
        """
        reports = Report.objects.all()
        serializer = ReportSerializer(reports, many=True)
        return JsonResponse(serializer.data, safe=False)

class CourseComfortabilityView(APIView):
    
        @swagger_auto_schema(
            operation_summary="Get course comfortability details",
            responses={200: CourseComfortabilitySerializer(), 404: "Course comfortability not found"},
            manual_parameters=[
                openapi.Parameter("conversation_id", openapi.IN_QUERY, description="Conversation ID", type=openapi.TYPE_STRING),
            ]
        )
        def get(self, request):
            """
            Acquires the details of a certain course comfortability by conversation_id.
            """
            conversation_id = request.query_params.get('conversation_id', '')
            course_comfortability = get_object_or_404(Conversation, conversation_id=conversation_id)
            serializer = CourseComfortabilitySerializer(course_comfortability)
            return JsonResponse(serializer.data)
    
        @swagger_auto_schema(
            operation_summary="Create a new course comfortability",
            response_body=CourseComfortabilitySerializer(),
            responses={201: CourseComfortabilitySerializer(), 400: "Bad Request", 404: "Conversation not found"}
        )
        def post(self, request):
            """
            Creates a new course comfortability regarding the user's experience during the conversation.
            """
            conversation_id = request.data.get('conversation_id', '')
            comfortability_rating = request.data.get('comfortability_rating', '')
        
            serializer = self.set_course_comfortability(conversation_id, comfortability_rating)
            if not serializer.is_valid():
                serializer.save()
                return JsonResponse(serializer.data, status=status.HTTP_201_CREATED)
            return ErrorResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        def set_course_comfortability(self, conversation_id, comfortability_rating):
            conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
            conversation = Conversation.objects.filter(conversation_id=conversation.conversation_id).update(comfortability_rating=comfortability_rating).first()
            serializer = CourseComfortabilitySerializer(conversation)
            return serializer

class CourseComfortabilityListView(APIView):
    
    @swagger_auto_schema(
        operation_summary="Get all course comfortabilities",
        responses={200: CourseComfortabilitySerializer(many=True)},
    )
    def get(self, request):
        """
        Gets all course comfortabilities
        """
        course_comfortabilities = Conversation.objects.all()
        serializer = CourseComfortabilitySerializer(course_comfortabilities, many=True)
        return JsonResponse(serializer.data, safe=False)

